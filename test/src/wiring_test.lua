-- Registry-shape test for the HTTP and UI surfaces. The harness does not call
-- its router or gateway, so the endpoint and web component are verified as
-- registry wiring: every entry exists and the cross-references line up.
local test = require("test")
local registry = require("registry")

local NS = "acme.starter"
local HANDLER_ID = "acme.starter.api:get_status"
local ENDPOINT_ID = "acme.starter.api:get_status.endpoint"
local VIEW_ID = "acme.starter:starter_view"
local NAV_ID = "acme.starter:nav_item"
local STATIC_ID = "acme.starter:ui_static"
local FS_ID = "acme.starter:ui_fs"
local POLICY_ID = "acme.starter.security:starter_endpoint_access"
local MODULE_ACCESS_ID = "acme.starter.security:module_access"
local RUNTIME_ID = "acme.starter.security:module_runtime"
local SCOPE_ID = "acme.starter.security:user_security_scope"
local BLOCK_ID = "acme.starter.blocks:block.write_log"
local BLOCK_FN_ID = "acme.starter.blocks:block_write_log"

local function get(id)
    local entry, err = registry.get(id)
    test.is_nil(err)
    test.not_nil(entry, id .. " is missing")
    return entry
end

local function meta_of(entry)
    if type(entry.meta) == "table" then return entry.meta end
    if type(entry.data) == "table" and type(entry.data.meta) == "table" then return entry.data.meta end
    return {}
end

local function data_of(entry)
    if type(entry.data) == "table" then return entry.data end
    return entry
end

local function resources_of(entry)
    local policy = data_of(entry).policy
    test.not_nil(policy, "policy entry must declare a policy")
    local resources = policy.resources
    if type(resources) == "string" then resources = { resources } end
    local set = {}
    for _, resource in ipairs(resources or {}) do set[resource] = true end
    return set
end

-- Entry references are written relative or namespace-qualified; compare fully
-- qualified.
local function qualify(ref, ns)
    if type(ref) ~= "string" then return ref end
    if ref:find(":", 1, true) then return ref end
    return ns .. ":" .. ref
end

local function define_tests()
    test.describe("acme.starter surface wiring", function()
        test.it("pairs the status endpoint with its handler on the router token", function()
            get(HANDLER_ID)
            local ep = data_of(get(ENDPOINT_ID))
            test.eq(qualify(ep.func, "acme.starter.api"), HANDLER_ID)
            test.eq(ep.method, "GET")
            test.eq(ep.path, "/starter/status")
            test.eq(meta_of(get(ENDPOINT_ID)).router, "app:api")
        end)

        test.it("declares a view served by the module's own static mount", function()
            local view = meta_of(get(VIEW_ID))
            test.eq(view.type, "view.component")
            test.eq(view.tag_name, "acme-starter")
            test.eq(view.entry_point, "index.js")
            test.eq(view.announced, true)
            test.eq(view.auto_register, true)

            local static = get(STATIC_ID)
            test.eq(data_of(static).path, "/" .. view.base_path)
            test.eq(qualify(data_of(static).fs, NS), FS_ID)
            get(FS_ID)
        end)

        test.it("mounts the view in the app nav by tag", function()
            local nav = meta_of(get(NAV_ID))
            test.eq(nav.type, "ui.nav_item")
            test.eq(nav.path, "/starter")
            test.eq(nav.render, "component")
            test.eq(nav.component_tag, meta_of(get(VIEW_ID)).tag_name)
        end)

        test.it("contributes the write-log Block backed by its implementation function", function()
            local block = get(BLOCK_ID)
            test.eq(meta_of(block).type, "kickside.block")
            local decl = data_of(block).block
            test.not_nil(decl, "block declaration must live in data.block")
            test.eq(decl.api_version, "kickside.block/v1")
            test.eq(decl.execution.kind, "function")
            test.eq(decl.execution.function_id, BLOCK_FN_ID)
            test.not_nil(decl.input, "block must declare an input schema")
            test.not_nil(decl.output, "block must declare an output schema")
            test.not_nil(decl.error, "a failed port requires an error schema")
            get(BLOCK_FN_ID)
        end)

        test.it("publishes a selectable module access policy over exact entry IDs", function()
            local module_access = get(MODULE_ACCESS_ID)
            local meta = meta_of(module_access)
            test.eq(meta.intent, "module_access")
            test.not_nil(meta.title, "module access policy needs a title")
            test.eq(meta.surface, NS)
            test.is_nil(meta.private)
            test.eq(resources_of(module_access)[ENDPOINT_ID], true)

            local includes = {}
            for _, id in ipairs(meta.includes or {}) do includes[id] = true end
            test.eq(includes[RUNTIME_ID], true)
            test.eq(includes[POLICY_ID], true)
            test.eq(meta_of(get(RUNTIME_ID)).private, true)

            local surface = resources_of(get(POLICY_ID))
            test.eq(surface[VIEW_ID], true)
            test.eq(surface[STATIC_ID], true)

            for _, id in ipairs({ MODULE_ACCESS_ID, POLICY_ID }) do
                for resource in pairs(resources_of(get(id))) do
                    test.is_nil(resource:find("*", 1, true), id .. " grants a pattern: " .. resource)
                end
            end
        end)

        test.it("binds every policy to the member security scope requirement", function()
            local requirement = get(SCOPE_ID)
            test.eq(meta_of(requirement).value_kind, "security.scope")
            local targeted = {}
            for _, target in ipairs(data_of(requirement).targets or {}) do
                test.eq(target.path, ".groups +=")
                targeted[target.entry] = true
            end
            for _, id in ipairs({ MODULE_ACCESS_ID, RUNTIME_ID, POLICY_ID }) do
                test.eq(targeted[id], true, id .. " is not bound to the member scope")
            end
        end)
    end)
end

local run_cases = test.run_cases(define_tests)
return { run = function(options) return run_cases(options) end }
