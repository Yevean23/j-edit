var dragEl = null;
var previously_dragged_over_el = null;
var page_state = [];
var auto_format = true;
var preview_area = false;
var menu_down = false;

var active_el = null;
var copy_el = null;
var cut_el = null;

var tab_size = 1;

function load_buffers(){
    var spaces = document.querySelectorAll(".drag_space");
    for(var j = 0; j< spaces.length; j++){
        var buffers = spaces[j].querySelectorAll(":scope > .dragn_buffer");
        for(var i = 0; i< buffers.length; i++){
            buffers[i].remove();
        }
        var contents = spaces[j].querySelectorAll(":scope > .dragn_content");
        for(var i =0; i< contents.length; i++){
            var buffer = new dragN_buffer();
            spaces[j].insertBefore(buffer,contents[i]);
        }
        var buffer = new dragN_buffer();
        spaces[j].append(buffer);
    }
}

function expand(el){
    el.style.height = "50px";
}

function collapse(el){
    el.style.height = "0px";
}


function collapse_check(buffers_only = false,exclude=null){
    
    var buffers = document.querySelectorAll(".dragn_buffer");
    for(var i =0; i< buffers.length; i++){
        if(buffers[i]!=exclude){
            buffers[i].style.height = "0px";
        }
    }
    if(!buffers_only){
        if(dragEl){
            dragEl.style.opacity = 1;
        }
        document.querySelector(".ghost").style.opacity = ""; 
    }
}


function drop(el){
    el.parentElement.replaceChild(dragEl,el);
    collapse_check();
    load_buffers();
}

function allow(el){
    if(el.classList.contains("dragn_buffer")){
        event.preventDefault();
    }else{
        return false;
    }
}

function create_ghost(el){
    var content = new dragN_content();
    var json = new json_innards();
    content.append(json);
    el.append(content);
}

function add_content(el, key= null, val = null, type = null){
    var space = el.parentElement.querySelector(".drag_space");
    var content = new dragN_content();
    var new_json = new json_innards();
    if(key){
        new_json.querySelector(".key").value=key;
    }
    if(val){
        new_json.querySelector(".value").value=val;
    }if(type=="null"){
        new_json.querySelector(".value").value="null";
    }
    content.append(new_json);
    space.append(content);

    if(type=="literal"){
        toggle_(content.querySelector(".tog"));
    }if(type=="null"){
        toggle_(content.querySelector(".tog"));
    }
    load_buffers();
    return content;
}

function add_content_(el){
    var added = add_content(el);
    added.querySelector(".key").click();
    added.querySelector(".key").focus();
}

function expand_space(el, imported = false){
    var par = el.parentElement;
    if(par.querySelector(".drag_space")){
        var new_content = new dragN_content();
        var new_json = new json_innards();
        new_content.append(new_json);
        if(par.querySelector(".tog").classList.contains("array")){
            new_json.querySelectorAll(".key-quotes")[0].hidden = true;
            new_json.querySelectorAll(".key-quotes")[1].hidden = true;
            new_json.querySelector(".json-colon").hidden = true;
            new_json.querySelector(".key").hidden = true;
        }
        par.querySelector(".drag_space").append(new_content);
        return new_content;
    }else{
        par.querySelector(".key").hidden = false;
        par.querySelector(".value").remove();
        for(var x in par.querySelectorAll(".values-quotes")){
            par.querySelectorAll(".values-quotes")[x].hidden = true;
        } 
        var tog = par.querySelector(".tog");
        for(x in single_types){
            tog.classList.remove(single_types[x]);
        }
        tog.classList.remove("literal");
        tog.classList.toggle("object");
        tog.innerHTML = "object";
        var new_space = new dragN_space();
        new_space.classList += " value container"
        if(!imported){
            var new_content = new dragN_content();
            var new_json = new json_innards();
            new_content.append(new_json);
            new_space.append(new_content);
        }
        par.append(new_space);
        el.innerHTML = "+ Add Entry";
        el.classList.toggle("add");
        return new_space;
    }
    
}

function getY(el){
    var PY =  el.offsetTop - document.querySelector(".display_area").scrollTop;
    while(el){
        if(el.classList.contains("document")){
            PY += el.offsetTop;
            break;
        }
        if(el.classList.contains("drag_space")){
            PY += el.offsetTop;
        }
        el = el.parentElement;
    }
    return PY;
}

function copy_to_clip(){
    document.querySelector(".preview_text_area").select();
    document.execCommand("copy");
}

function preview_json(setPos){
    var json_input = document.querySelector(".inputs");
    var raw_json = unpack_string(json_input);
    
    var response_field = document.querySelector(".preview_text_area");
    if(auto_format){
        var carpos= getCaretPostion(response_field);
        format_preview(tab_size);
        if(setPos){
            setCaretPosition(response_field,carpos);
        }  
    }else{
        response_field.value = raw_json;
        response_field.innerHTML = raw_json;
    }

}

function getCaretPostion(element){
    return element.selectionStart;
}

function getCaretEnd(element){
    return element.value.length;
}

function setCaretPosition(element, caretPos) {
    var el = element;

    el.value = el.value;
    // ^ this is used to not only get "focus", but
    // to make sure we don't have it everything -selected-
    // (it causes an issue in chrome, and having it doesn't hurt any other browser)

    if (el !== null) {

        if (el.createTextRange) {
            var range = el.createTextRange();
            range.move('character', caretPos);
            range.select();
            return true;
        }

        else {
            // (el.selectionStart === 0 added for Firefox bug)
            if (el.selectionStart || el.selectionStart === 0) {
                el.focus();
                el.setSelectionRange(caretPos, el.selectionEnd,"forward");
                return true;
            }

            else  { // fail city, fortunately this never happens (as far as I've tested) :)
                el.focus();
                return false;
            }
        }
    }
}

function unpack_string(element, arr = false, start = true){
    if(start){
        var string = "{"
    }else{
        var string = ""
    }
    
    var containers = element.querySelectorAll(":scope > .container");
    
    for (var i = 0; i < containers.length; i++){
        var key = containers[i].querySelector(".key");
        var value = containers[i].querySelector(".value");
        var eltype = containers[i].querySelector(".tog");
        if(value.classList.contains("container")){
            if(eltype.classList.contains("array")){
                if(key.value == key.defaultValue){
                    var entry = "[" + unpack_string(value,true,false) + "]";
                }else{
                    var entry = '\"' + key.value + '\"' + ':' + "[" + unpack_string(value,true,false) + "]";
                }
                string += entry;   
            }else{
                if(arr){
                    if(key.value == key.defaultValue){
                        var entry = '{' + unpack_string(value,false,false) + '}';
                    }else{
                        var entry = '{' + '\"' + key.value + '\"' + ':' + '{' + unpack_string(value,false,false) + '}' + '}';

                    }
                    
                }else{
                    if(key.value == key.defaultValue){
                        var entry = '{' + unpack_string(value,false,false) + '}';
                    }else{
                        var entry = '\"' + key.value + '\"' + ':' + '{' + unpack_string(value,false,false) + '}';
                    }
                    
                }

                
                string += entry;   
            }
                
        }else{
            if(arr){
                if(eltype.classList.contains("literal")){
                    var entry = value.value;
                }else{
                    var entry = '\"' + value.value + '\"';
                }
                
            }else{
                if(eltype.classList.contains("literal")){
                    var entry = '\"' + key.value + '\"' + ':' + value.value;
                }else{
                    var entry = '\"' + key.value + '\"' + ':' + '\"' + value.value + '\"';
                }
                
            }
            string += entry;
        }
        
        if(i!=containers.length-1){
            string += ','
        }
    }

    if(start){
        string += '}';
    }
    return string;
}


function map_string_to_inputs(el,contents){
    if(typeof(contents) != "object"){
        var json = JSON.parse(contents);
    }else{
        var json = contents;
    }
    
    for (x in json) {
        
        if(typeof(json[x]) == "object"){
            if(json[x]=== null){
                add_content(el,x,json[x],"null");
            }else if(Array.isArray(json[x])){
                add_content(el,x);
                var containers = el.parentElement.querySelectorAll('.container');
                var nested_el = containers[containers.length - 1].querySelector(".expand");
                var tog = containers[containers.length - 1].querySelector(".tog");
                expand_space(nested_el,imported=true);
                toggle_(tog);
                containers = el.parentElement.querySelectorAll('.container');
                map_string_to_inputs(containers[containers.length-1].parentElement.parentElement.parentElement.querySelector(".add"),json[x][0]);
                toggle_(tog);
                toggle_(tog);
            }else{
                add_content(el,x);
                var containers = el.parentElement.querySelectorAll('.container');
                var nested_el = containers[containers.length - 1].querySelector(".expand");
                expand_space(el=nested_el,imported=true);
                containers = el.parentElement.querySelectorAll('.container');
                map_string_to_inputs(containers[containers.length-1].parentElement.parentElement.parentElement.querySelector(".add"),json[x]);
            }
        }else{
            if(typeof(json[x])=="string"){
                add_content(el,x,json[x]);
            }else{
                add_content(el,x,json[x],"literal");
            }
        } 
    }
    
}

function clear_inputs(){
    var deletes = document.querySelectorAll(".dragn_content");
    for(var i = 0; i < deletes.length; i++){
        deletes[i].remove();
    }
}

function map_preview_to_inputs(){
    var preview_text = document.querySelector(".preview_text_area").value;
    try{
        if(auto_format){
            preview_text = JSON.stringify(JSON.parse(preview_text));
        }
        clear_inputs();
        var ghost = document.querySelector(".ghost");
        map_string_to_inputs(ghost,preview_text);
    }catch{

    }
}

function fill_value(element, type, oldtype){
    var valuebox = element.closest(".container").querySelector(".value");
    if(valuebox.value == valuebox.defaultValue){
        valuebox.value = single_types_defaults[type];
    }
    if(valuebox.value.toString() == single_types_defaults[oldtype].toString()){
        valuebox.value = single_types_defaults[type];
    }
}

function remove_value_quotes(element){
    var par = element.closest(".container");
    for(var x in par.querySelectorAll(".values-quotes")){
        par.querySelectorAll(".values-quotes")[x].hidden = true;
    } 
}

function add_value_quotes(element){
    var par = element.closest(".container");
    for(var x in par.querySelectorAll(".values-quotes")){
        par.querySelectorAll(".values-quotes")[x].hidden = false;
    } 
}

// todo: set type dynamically:
function set_type_automatically(element){
    var val = element.value;
    var tog = element.parentElement.closest(".container").querySelector(".tog");

    DOMTokenList.prototype.remove.apply(tog.classList,literal_types);

    console.log(val);
    
    if(tog.classList.contains("literal")){
        if(!val.replace(/\s/g, '').length || isNaN(val) && val.toLowerCase() != "null" && val.toLowerCase() != "true" && val.toLowerCase() != "false"){
            tog.classList.add("error");
            return false;
        }
    }
    if (tog.classList.contains("string")){
        return;
    }

    

    if(isNaN(val) || val == ""){
        if(val.toLowerCase() == "true" || val.toLowerCase() == "false"){
            tog.classList.add("boolean");
        }else if(val.toLowerCase() == "null"){
            tog.classList.add("null");
        }
    }
    else{
        tog.classList.add("number");
    }

    
    
    // get type of value and then set the class of element appropriately
    // if the type is lit but its not a number, boolean or null, set element color to error
}


function hide_array_keys(element, show=true){
    var par = element.closest(".container");
    var containers = par.querySelector(".json_innards").querySelector(".container").querySelectorAll(":scope > .container");
    for(var i = 0; i < containers.length; i++){
        var object_check = containers[i].querySelector(".json_innards").querySelector(".tog").classList.contains("object");
        if(!object_check){
            var key_quotes = containers[i].querySelector(".json_innards").querySelectorAll(":scope > .key-quotes");
            for(var j in key_quotes){
                key_quotes[j].hidden = show;
            }
            var key = containers[i].querySelector(".json_innards").querySelector(":scope > .key");
            key.hidden = show;
            var colon = containers[i].querySelector(".json_innards").querySelector(":scope > .json-colon");
            colon.hidden = show;
        }
    }
}

var color_scheme = {
    "string":"",
    "literal":"",
    "number":"",
    "boolean":"",
    "null":"",
    "error":"",
    "object":"",
    "array":""
};
var single_types = ["string","literal"];
var literal_types = ["number","boolean","null","error"];
var object_types = ["object","array"];
// todo: string, number, true, false, null :D
// todo: get expanded types working
function toggle_(el){   
    if(el.classList.contains("array") || el.classList.contains("object")){
        var place = object_types.indexOf(el.innerHTML.toLowerCase());
        var oldtype = el.innerHTML.toLowerCase();
        var newtype = object_types[(place + 1) % 2];
        el.innerHTML = newtype;
        el.classList.toggle(newtype);
        el.classList.toggle(oldtype);
        if(newtype == "array"){
            hide_array_keys(el, true);
        }else{
            hide_array_keys(el, false);
        }
    }else{
        
        var place = single_types.indexOf(el.innerHTML.toLowerCase());
        var oldtype = el.innerHTML.toLowerCase();
        var newtype = single_types[(place + 1) % 2];
        el.innerHTML = newtype;
        el.classList.toggle(newtype);
        el.classList.toggle(oldtype);
        if(newtype!="string"){
            remove_value_quotes(el);
        }else{
            add_value_quotes(el);
        }
    }
    set_type_automatically(el.closest(".container").querySelector(".value"));
}

function dropdown(el){
    if(el.querySelector(".dropdown-content").classList.contains("show")){
        el.querySelector(".dropdown-content").classList.remove("show");
        menu_down = false;
    }else{
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
        el.querySelector(".dropdown-content").classList.toggle("show");
        menu_down =true;
    } 
}

window.onclick = function(event) {
    if(event.target.classList.contains("color_scheme")){
        return true;
    }
    if (!event.target.matches('.dropbtn')){ 
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
                menu_down = false;
            }
        }
    }
    refresh_visual_components();
}

function save_state(){
    var current = document.body.cloneNode(true);
    page_state.push(current);
}

function undo(){
    var last = page_state[page_state.length - 1];
    document.body = last;
}

function preview_area_(){
    if(preview_area){
        document.querySelector(".margin").hidden = false;
        document.querySelector(".preview_area").hidden = false;
    }else{
        document.querySelector(".margin").hidden = true;
        document.querySelector(".preview_area").hidden = true;
    }
}

//todo: when font is big, the buttons start linebreaking within the json element
function change_font(el){
    var area = document.querySelector(".display_area");
    area.style.fontSize = el.value;
}

function change_indent(el){
    tab_size = el.value;
    if(auto_format){
        format_preview(tab_size);
    }
}

function format_preview(indent_size){
    var json_input = document.querySelector(".inputs");
    var raw_json = unpack_string(json_input);
    var response_field = document.querySelector(".preview_text_area");
    if(auto_format){
        var json_string = JSON.stringify(JSON.parse(raw_json),null, Number(indent_size));
        response_field.value = json_string;
        response_field.innerHTML = json_string;
    }else{
        response_field.value = raw_json;
        response_field.innerHTML = raw_json;
    }
    
}

// todo: make this the generic function that is computed after clicks and such
function refresh_visual_components(){
    color_code_editor();
    load_buffers();
    
}

function color_code_editor(){
    var containers = document.querySelectorAll(".dragn_content");
    var editor_colors = document.querySelector(".editor_color_scheme");


    if(document.querySelector(".color_code_editor").checked){
        //editor_colors.hidden = false;
        for(var i = 0; i < containers.length; i++){
            containers[i].querySelector(".tog").classList.remove("color_coded");
            containers[i].querySelector(".tog").classList.toggle("color_coded");
        }
    }else{
        //editor_colors.hidden = true;
        for(var i = 0; i < containers.length; i++){
            containers[i].querySelector(".tog").classList.remove("color_coded");
        }
    }
}

function new_file(){
    if(document.querySelector(".drag_space").hasChildNodes()){
        if(confirm("Are you sure you want to start a new file?")){
            clear_inputs();
            clear_name();
        }
    }else{
        clear_inputs();
        clear_name();
    }
}

function clear_name(){
    var filename = document.querySelector(".filename");
    filename.value = filename.defaultValue;
}

function open_file(){
    var open = document.querySelector(".json_input");
    open.click();
}

function import_json(){
    clear_inputs();
    clear_name();
    var file_input = document.querySelector(".json_input");
    if( file_input.files.length == 0 ){
    }else{
        var file = file_input.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            var contents = e.target.result;
            // Display file content
            document.querySelector(".filename").value = file.name.replace(".json","");
            clear_inputs();
            document.querySelector(".preview_text_area").value = contents;
            map_preview_to_inputs();
            file_input.value = "";
        };
        reader.readAsText(file);
    }
}

function save_file(){
    var test_name =  document.querySelector(".filename").value;

    var json_input = document.querySelector(".inputs");
    var raw_json = unpack_string(json_input);
    var json_string = JSON.stringify(JSON.parse(raw_json),null, 4);

    var download = document.createElement('a');
    download.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json_string));
    download.setAttribute('download', test_name + '.json');
  
    download.style.display = 'none';
    document.body.appendChild(download);
  
    download.click();
  
    document.body.removeChild(download);

}

function copy_element(el = null){
    copy_el = active_el.cloneNode(true);
}

function delete_element(el,from_key = false){
    if(!from_key){
        el.closest(".container").remove();
    }else{
        
        var temp_el;
        if(temp_el = active_el.nextElementSibling.nextElementSibling){

        }else if(temp_el = active_el.previousElementSibling.previousElementSibling){

        }else{
            active_el.remove();
            active_el = null;
            return false;
        }
        active_el.remove();
        temp_el.click();
        active_el.querySelector(".key").focus();
        
    }
    load_buffers();
}


// todo: can be cleaned up to only use copy el probably, same as copy, only cut el is removed
function cut_element(){
    copy_el = null;
    cut_el = active_el.cloneNode(true);
    active_el.remove();
}

function paste_element(){
    if(copy_el){
        active_el.classList.toggle("active_element");
        var new_node = copy_el.cloneNode(true);
        active_el.parentElement.closest(".container").insertBefore(new_node,active_el);
        active_el = new_node;
    }else{
        active_el.classList.toggle("active_element");
        active_el.parentElement.closest(".container").insertBefore(cut_el,active_el);
        active_el = cut_el;
        copy_el = cut_el.cloneNode(true);
    }
    active_el.querySelector(".key").focus();
    load_buffers();
}


function popup(el){
    var current_popup = document.querySelector(".pop_up_close");
    console.log(current_popup);
    if(current_popup){
        current_popup.click();
    }

    var pu = new pop_up();
    
    
    if(el.classList.contains("dev-updates")){
        var texttemp = new dev_updates();
        pu.querySelector(".pop_up_text").innerHTML=texttemp.querySelector(".body").innerHTML;
        pu.querySelector(".pop_up_header").innerHTML=texttemp.querySelector(".header").innerHTML;
        pu.classList.add("dev-updates")
    }




    document.body.appendChild(pu);
}

function disable_other_active_elements(){
    var boxes = document.querySelectorAll(".dragn_content");
    for(var i = 0; i < boxes.length;i++){
        if(boxes[i].classList.contains("active_element")){
            boxes[i].classList.toggle("active_element");
        }
    }
    active_el = null;
}

function add_using_enter(){
    var addel = null;
    if(active_el){
        var tryel = active_el.parentElement.parentElement.closest(".container");
        if(tryel){
            addel = tryel.querySelector(".add")
        }
        if(!addel){
            addel = document.querySelector(".ghost");
        }
    }else{
        addel = document.querySelector(".ghost");
    }
    
    var added = add_content(addel);
    if(active_el){
        var somespace = added.parentElement.closest(".drag_space");
        added.remove();
        somespace.insertBefore(added,active_el.nextElementSibling.nextElementSibling);
        load_buffers();
    }
    added.click();
    added.querySelector(".key").focus();
}

document.addEventListener('click', function (event) {
    var el = event.target;
    disable_other_active_elements();
    if(el.classList.contains("dropbtn")){
        dropdown(el);
    }
    if(el.classList=="new_file"){
        new_file();
    }else if(el.classList=="open_file"){
        open_file();
    }else if(el.classList=="save_file"){
        save_file();
    }
    if(el.classList.contains("auto_format")){
        if(el.checked){
            auto_format = true;
        }else{
            auto_format = false;
        }
    }
    if(el.classList.contains("preview_area_checked")){
        if(el.checked){
            preview_area = true;
        }else{
            preview_area = false;
        }
        preview_area_();
    }
    if(el.classList.contains("tog")){
        toggle_(el);
    }
    if(el.classList.contains("delete")){
        delete_element(el);
    }

    if(el.classList.contains("dragn_content")){
        var boxes = document.querySelectorAll(".dragn_content");
        for(var i = 0; i < boxes.length;i++){
            if(boxes[i].classList.contains("active_element")){
                boxes[i].classList.toggle("active_element");
            }
        }
        el.classList.toggle("active_element");
        active_el = el;
    }

    if(el.classList.contains("key")||el.classList.contains("value")){
        var newac = el.parentElement.closest(".container");
        disable_other_active_elements();
        newac.classList.toggle("active_element");
        active_el = newac;
    }

    if(el.classList.contains("json_entry")){
        disable_other_active_elements();
        ac_el = el.parentElement.closest(".dragn_content");
        ac_el.classList.toggle("active_element");
        active_el = ac_el;
    }

    if(el.classList.contains("preview_text_area")){
        preview_json(true);
    }else{
        preview_json(false);
    }
}, false);

// right click
document.addEventListener('mousedown', function (event) {
    var el = event.target;
    if (event.which == 3) {
        
    }
}, false);

document.addEventListener('dragend', function (event) {
    dragEl.querySelector(".key").focus();
    dragEl = null;
    collapse_check();
    preview_json();
}, false);

document.addEventListener('mouseover', function (event) {
    var el = event.target;
    if(!dragEl){
        if(el.classList.contains("dragn_content") && !el.classList.contains("active_element") ){
            el.style.background = "lightgray";
        }
        
        /*if((el.classList.contains("key") || el.classList.contains("value") ) && !el.closest(".container").classList.contains("active_element")){
            el.closest(".container").style.background = "lightgray";
        }*/

    }
    if(menu_down){
        if(el.classList.contains("dropbtn")){
            if(!el.querySelector(".dropdown-content").classList.contains("show")){
                dropdown(el);
            }
        }
    }
}, false);

/* 
dynamically handling some visual aesthetics, when a mouse leaves a drag element, it's opacity is reset
*/
document.addEventListener('mouseout', function (event) {
    var el = event.target;
    if(el.classList.contains("dragn_content") && el!=dragEl){
        el.style.background = "";
    }        
}, false);

// todo: when using enter to add entry to array, element is added with key.

document.addEventListener('keyup', function (event) {
    // if some check box is toggled, make it autogo,
    // otherwise, have an apply button, at least going from json to mapping

    if(!event.target.classList.contains("preview_text_area")){
        preview_json(false);
    }else{
        map_preview_to_inputs();
    }
    
}, false);


// todo: writing text inside object, moves next element outside teh object inside

// todo: if active element is scrolled out of viewing area, scroll to active element

document.addEventListener('key', function (event) {
    if(event.key=="Enter"){

    }    
}, false);

document.addEventListener('dragover', function (event) {
    var el = event.target;
    if(el.classList.contains("dragn_content")){
        var py =getY(el);
        var ely = (py + py + el.offsetHeight) / 2;
        var y = event.clientY; 
        if(y>ely){
            expand(el.nextElementSibling);
            collapse(el.previousElementSibling);
        }else{
            collapse(el.nextElementSibling);
            expand(el.previousElementSibling);
        }
    }
    if(el.classList.contains("dragn_buffer")){
        collapse_check(buffers_only=true,exclude=el);
    }
    
    
    if(!el.classList.contains("dragn_buffer") && !el.classList.contains("dragn_content")){
        collapse_check(buffers_only=true);
    }
}, false);

// leaving color coded json element resets the color to white rather than the color code
document.addEventListener('dragleave', function (event) {
    var el = event.target;
    if(el.classList.contains("dragn_buffer")){
        collapse(el);
    }
}, false);

document.addEventListener('dragstart', function (event) {
    var el = event.target;
    if(el.classList.contains("dragn_content")){
        var boxes = document.querySelectorAll(".dragn_content");
        for(var i = 0; i < boxes.length;i++){
            if(boxes[i].classList.contains("active_element")){
                boxes[i].classList.toggle("active_element");
            }
        }
        el.classList.toggle("active_element");

        dragEl = el;
        el.style.opacity = 0.5;
        el.style.background = "gray";
        document.querySelector(".ghost").style.opacity = 0; 
        return true;
    }
    return false;
}, false);

document.addEventListener('mousedown', function (event) {
	var clickedElem = event.target;
    if(clickedElem.classList.contains("no_drag")){
        var boxes = document.querySelectorAll(".dragn_content");
        for(var i = 0; i < boxes.length; i++){
            boxes[i].setAttribute("draggable",false);
        }
    }
}, false);

document.addEventListener('mouseup', function () {
    var boxes = document.querySelectorAll(".dragn_content");
    for(var i = 0; i < boxes.length; i++){
        boxes[i].setAttribute("draggable",true);
    }
}, false);

// TODO:
// Alternate is using CTRL+Arrow to jump even if in the middle of a key or value
function switch_to(element){
    element.click();
    element.select();
    element.focus();
}

function move_up(el){
    var moveto;
    if(el.classList.contains("key")){
        moveto = el.parentElement.parentElement.previousElementSibling.previousElementSibling.querySelector(".key"); 
        if(moveto){
            switch_to(moveto);
        }
    }
    if(el.classList.contains("value")){
        moveto = el.parentElement.parentElement.previousElementSibling.previousElementSibling.querySelector(".value"); 
        if(moveto){
            switch_to(moveto);
        }
    }
}

function move_down(el){
    var moveto;
    if(el.classList.contains("key")){
        moveto = el.parentElement.parentElement.nextElementSibling.nextElementSibling.querySelector(".key"); 
        if(moveto){
            switch_to(moveto);
        }
    }
    if(el.classList.contains("value")){
        moveto = el.parentElement.parentElement.nextElementSibling.nextElementSibling.querySelector(".value"); 
        if(moveto){
            switch_to(moveto);
        }
    }
}

function move_left(el){
    var moveto;
    var carpos = getCaretPostion(el);
    if(carpos == 0){
        if(el.classList.contains("value")){
            moveto = el.parentElement.querySelector(".key"); 
            if(moveto){
                switch_to(moveto);
            }
        }
    }
}

function move_right(el){
    var moveto;
    var carpos = getCaretPostion(el);
    if(carpos == el.value.length){
        if(el.classList.contains("key")){
            moveto = el.parentElement.querySelector(".value"); 
            if(moveto){
                switch_to(moveto);
            }
        }
    }
    
}

document.addEventListener('keydown', function (event) {
    var keyedElem = event.target;
    var keycode = event.keyCode;
    //todo: disable later
    //console.log(keycode);
    if(keycode == 38){
        move_up(keyedElem);
    }else if(keycode == 40){
        move_down(keyedElem);
    }else if(keycode == 37){
        move_left(keyedElem);
    }else if(keycode == 39){
        move_right(keyedElem);
    }
}, false);

function toggle_shortcut(){
    var tryel = active_el.closest(".container");
    if(tryel){
        tryel = tryel.querySelector(".tog");
        if(tryel){
            toggle_(tryel);
        }
    }
}

var map = {}; // You could also use an array
onkeydown = onkeyup = function(e){
    e = e || event; // to deal with IE
    map[e.keyCode] = e.type == 'keydown';
    if(!e.target.classList.contains("preview_text_area")){
        if(map[17] && map[67]){ // CTRL+C
            if(!e.target.classList.contains("key") && !e.target.classList.contains("value")){
                copy_element();
                map = {};
                return false;
            }
            copy_el = null;
        }if(map[17] && map[88]){ // CTRL+X
            cut_element();
            map = {};
            return false;
        }if(map[17] && map[86]){ // CTRL+V
            if(copy_el || cut_el){
                paste_element();
                return false;
            }
        }if(map[17] && map[46]){ // CTRL+delete
            delete_element(e.target,true);
        }if(map[17] && map[81]){ // CTRL+Q
            toggle_shortcut();
            return false;
        }if(map[17] && map[13]){ // CTRL+ENTER
            if(active_el){
                var newspace = expand_space(active_el.querySelector(".expand"));
                newspace.querySelector(".key").click();
                newspace.querySelector(".key").focus();
            }
            return false;
        }if(map[13]){ // Enter
            add_using_enter();
            map = {};
        }
    }
    if(e.target.classList.contains("value")){
        set_type_automatically(e.target);
    }
}

class dragN_buffer extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("dragn-buffer").cloneNode(true);
        const templateContent = template.content;
        return templateContent.querySelector(".dragn_buffer");
    }
}
customElements.define("dragn-buffer", dragN_buffer);

class dragN_space extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("dragn-space").cloneNode(true);
        const templateContent = template.content;
        return templateContent.querySelector(".drag_space");
    }
}
customElements.define("dragn-space", dragN_space);

class dragN_content extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("dragn-content").cloneNode(true);
        const templateContent = template.content;
        return templateContent.querySelector(".dragn_content");
    }
}
customElements.define("dragn-content", dragN_content);

class json_innards extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("json-innards").cloneNode(true);
        const templateContent = template.content;
        return templateContent.querySelector(".json_innards");
    }
}
customElements.define("json-innards", json_innards);

class pop_up extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("pop-up").cloneNode(true);
        const templateContent = template.content;
        return templateContent.querySelector(".pop_up");
    }
}
customElements.define("pop-up", pop_up);

class dev_updates extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("popup-dev-updates").cloneNode(true);
        const templateContent = template.content;
        return templateContent.querySelector(".content");
    }
}
customElements.define("popup-dev-updates", dev_updates);


// todo:
// testing:
// ...

// cross browser