-- Each client renders a local frozen panel; the server owns its shared open/closed state.
local cfg = MloGarageConfig
local prefix = GetCurrentResourceName() .. ':garage:'
local states, objects, loading, retry, last = {}, {}, {}, {}, {}
local enabled, stopped = false, false
local notice, noticeUntil = '', 0
local function accept(row)
    if type(row) ~= 'table' or not cfg.doors[row.id] then return end
    states[row.id] = { open = row.open == true, started = GetGameTimer() - math.max(0, math.min(cfg.durationMs, tonumber(row.elapsed) or 0)) }
end
RegisterNetEvent(prefix .. 'snapshot', function(allowed, rows)
    if source ~= 65535 then return end
    enabled = allowed == true
    for _, row in ipairs(rows) do accept(row) end
end)
RegisterNetEvent(prefix .. 'state', function(row)
    if source ~= 65535 then return end
    accept(row)
end)
RegisterNetEvent(prefix .. 'notice', function(text)
    if source ~= 65535 then return end
    notice, noticeUntil = text, GetGameTimer() + 4000
end)
local function amount(id)
    local s = states[id]
    if not s then return 0, false end
    local t = math.min(1, math.max(0, (GetGameTimer() - s.started) / cfg.durationMs))
    return s.open and t or 1 - t, t < 1
end
-- A retractable up-and-over panel: bottom edge rises at the doorway while
-- the top travels into the garage. Quaternion = world yaw * local tilt.
local function pose(entity, d, t)
    t = t * t * (3 - 2 * t)
    local angle, yaw = t * math.pi / 2, math.rad(d.heading)
    local back = d.height / 2 * math.sin(angle)
    SetEntityCoordsNoOffset(entity, d.x + math.sin(yaw) * back, d.y - math.cos(yaw) * back,
        d.z + d.height / 2 * (1 - math.cos(angle)) + d.clearance * t, false, false, false)
    local sh, ch, sy, cy = math.sin(angle / 2), math.cos(angle / 2), math.sin(yaw / 2), math.cos(yaw / 2)
    SetEntityQuaternion(entity, sh * cy, sh * sy, ch * sy, ch * cy)
end
local function remove(id)
    local entity = objects[id]
    if entity and DoesEntityExist(entity) then DeleteEntity(entity) end
    objects[id], last[id] = nil, nil
end
local function near(d, radius)
    local p = GetEntityCoords(PlayerPedId())
    return #(p - vector3(d.x, d.y, d.z)) < radius
end
CreateThread(function()
    while not stopped do
        TriggerServerEvent(prefix .. 'sync')
        Wait(5000)
    end
end)
CreateThread(function()
    while not stopped do
        for id, d in ipairs(cfg.doors) do
            if enabled and near(d, 150.0) then
                if objects[id] and not DoesEntityExist(objects[id]) then objects[id], last[id] = nil, nil end
                if not objects[id] and not loading[id] and GetGameTimer() >= (retry[id] or 0) then
                    loading[id] = true
                    CreateThread(function()
                        local hash = GetHashKey(d.model)
                        RequestModel(hash)
                        local deadline = GetGameTimer() + 10000
                        while not HasModelLoaded(hash) and not stopped and GetGameTimer() < deadline do Wait(50) end
                        if not stopped and enabled and HasModelLoaded(hash) and near(d, 150.0) then
                            local t = amount(id)
                            local entity = CreateObjectNoOffset(hash, d.x, d.y, d.z, false, false, false)
                            if entity ~= 0 then
                                SetEntityAsMissionEntity(entity, true, true)
                                pose(entity, d, t)
                                FreezeEntityPosition(entity, true)
                                SetEntityInvincible(entity, true)
                                SetEntityLodDist(entity, 200)
                                objects[id], last[id] = entity, t
                            end
                        end
                        SetModelAsNoLongerNeeded(hash)
                        loading[id], retry[id] = nil, GetGameTimer() + 5000
                    end)
                end
            else remove(id) end
        end
        Wait(500)
    end
end)
CreateThread(function()
    while not stopped do
        local sleep, closest, distance = 250, nil, math.huge
        local p = GetEntityCoords(PlayerPedId())
        for id, entity in pairs(objects) do
            local d = cfg.doors[id]
            local t, moving = amount(id)
            if moving then sleep = 0 end
            if DoesEntityExist(entity) then
                if last[id] ~= t then pose(entity, d, t); last[id] = t end
                local dist = #(p - vector3(d.x, d.y, d.z))
                if dist < d.distance and dist < distance then closest, distance = id, dist end
            end
        end
        if closest then
            sleep = 0
            local _, moving = amount(closest)
            BeginTextCommandDisplayHelp('STRING')
            AddTextComponentSubstringPlayerName(GetGameTimer() < noticeUntil and notice or (moving and 'Garage door moving...' or 'Press ~INPUT_CONTEXT~ to open / close the garage door'))
            EndTextCommandDisplayHelp(0, false, true, -1)
            if not moving and IsControlJustReleased(0, 38) then TriggerServerEvent(prefix .. 'toggle', closest) end
        end
        Wait(sleep)
    end
end)
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    stopped = true
    for id in pairs(objects) do remove(id) end
end)
