-- Generates PlantUML images and injects global config
local pandoc = require 'pandoc'
local system = require 'pandoc.system'

function CodeBlock(block)
    if block.classes:includes('plantuml') then
        local content = block.text
        -- 1. Read Global Config
        local f = io.open('D:/UltimateStorage/GitSynced/SEP3/Documentation/Styles/plantuml-config.puml', 'r')
        local config = ''
        if f then config = f:read('*all'); f:close() end
        -- 2. Inject Config
        if content:find('@startuml') then
             content = content:gsub('@startuml', '@startuml\n' .. config)
        else
             content = '@startuml\n' .. config .. '\n' .. content .. '\n@enduml'
        end
        -- 3. Render
        local hash = pandoc.sha1(content)
        local img_dir = 'plantuml-images'
        pcall(system.make_directory, img_dir)
        local fname = img_dir .. '/' .. hash .. '.png'
        local f_img = io.open(fname, 'r')
        if f_img == nil then
            local result = pandoc.pipe('plantuml', {'-pipe', '-tpng'}, content)
            local f_out = io.open(fname, 'wb'); f_out:write(result); f_out:close()
        else
            f_img:close()
        end

        -- 4. Attributes & Manual LaTeX Generation
        local attributes = block.attributes
        local caption_text = attributes['caption']
        local width = attributes['width'] or '60%'

        -- CHECK: If generating PDF (LaTeX), write raw TeX to force centering/captions
        if FORMAT:match 'latex' then
            -- Convert '60%' to '0.6\\linewidth' for LaTeX
            local latex_width = width
            if width:match('%%') then
                 local num = tonumber(width:match('(%d+)'))
                 if num then latex_width = (num/100) .. '\\linewidth' end
            end

            -- NOTE: \\\\begin = literal \\begin. \\n = newline character.
            local tex = ''
            tex = tex .. '\\begin{figure}[H]\n'
            tex = tex .. '\\centering\n'
            tex = tex .. '\\includegraphics[width=' .. latex_width .. ']{' .. fname .. '}\n'
            if caption_text then
                tex = tex .. '\\caption{' .. caption_text .. '}\n'
            end
            tex = tex .. '\\end{figure}'

            return pandoc.RawBlock('latex', tex)
        else
            -- Fallback for HTML/Docx (Standard Pandoc Behavior)
            local img_attr = pandoc.Attr(block.identifier, block.classes, attributes)
            attributes['width'] = width
            
            local caption_content = {}
            local img_title = ''
            if caption_text then
                caption_content = { pandoc.Str(caption_text) }
                img_title = 'fig:'
            end
            return pandoc.Para({ pandoc.Image(caption_content, fname, img_title, img_attr) })
        end
    end
end
