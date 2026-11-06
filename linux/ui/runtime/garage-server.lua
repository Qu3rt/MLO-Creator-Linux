-- Generated garage controller. State is authoritative on the server and resets closed on restart.
local prefix = GetCurrentResourceName() .. ':garage:'
local states, requests = {}, {}
local cfg = MloGarageConfig
local function packet(id)
    local s = states[id]
    return { id = id, open = s and s.open or false, elapsed = s and math.max(0, GetGameTimer() - s.started) or cfg.durationMs }
end
local function rateLimit(src, key, delay)
    local now = GetGameTimer()
    requests[src] = requests[src] or {}
    if requests[src][key] and now - requests[src][key] < delay then return false end
    requests[src][key] = now
    return true
end
RegisterNetEvent(prefix .. 'sync', function()
    local src = source
    if not rateLimit(src, 'sync', 1000) then return end
    local enabled = GetPlayerRoutingBucket(src) == cfg.bucket
    local rows = {}
    if enabled then for id in ipairs(cfg.doors) do rows[#rows + 1] = packet(id) end end
    TriggerClientEvent(prefix .. 'snapshot', src, enabled, rows)
end)
local function occupied(d)
    local angle = math.rad(d.heading)
    local cs, sn = math.cos(angle), math.sin(angle)
    local function inside(entity, padding)
        if entity == 0 or not DoesEntityExist(entity) or GetEntityRoutingBucket(entity) ~= cfg.bucket then return false end
        local p = GetEntityCoords(entity)
        local dx, dy = p.x - d.x, p.y - d.y
        return math.abs(dx * cs + dy * sn) < d.width / 2 + padding
            and (-dx * sn + dy * cs) > -d.height - padding and (-dx * sn + dy * cs) < d.depth / 2 + padding
            and p.z > d.z - d.height / 2 - 1 and p.z < d.z + d.height / 2 + 2
    end
    for _, player in ipairs(GetPlayers()) do if inside(GetPlayerPed(player), 0.6) then return true end end
    for _, vehicle in ipairs(GetAllVehicles()) do if inside(vehicle, 2.5) then return true end end
    return false
end
RegisterNetEvent(prefix .. 'toggle', function(id)
    local src = source
    if not rateLimit(src, 'toggle', 500) then return end
    if type(id) ~= 'number' or id ~= math.floor(id) then return end
    local d = cfg.doors[id]
    if not d or GetPlayerRoutingBucket(src) ~= cfg.bucket then return end
    if cfg.ace ~= '' and not IsPlayerAceAllowed(src, cfg.ace) then return end
    local ped = GetPlayerPed(src)
    if ped == 0 or not DoesEntityExist(ped) then return end
    local p = GetEntityCoords(ped)
    local dx, dy, dz = p.x - d.x, p.y - d.y, p.z - d.z
    if dx * dx + dy * dy + dz * dz > d.distance * d.distance then return end
    local now, s = GetGameTimer(), states[id]
    if s and now - s.started < cfg.durationMs then return end
    if occupied(d) then
        TriggerClientEvent(prefix .. 'notice', src, 'Move people and vehicles clear of the garage door before moving it.')
        return
    end
    states[id] = { open = not (s and s.open), started = now }
    TriggerClientEvent(prefix .. 'state', -1, packet(id))
end)
AddEventHandler('playerDropped', function() requests[source] = nil end)
