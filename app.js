'use strict';

/**
 *  Global Variables
 */

// Flag of not displaying card icons
var boolHideImg = true;
// Flag of displaying marked cards only
var boolMarkOnly = false;
// The current sorting method
var sortMethod = "";

// Sorting attributes
var attrs = ['rar', 'grp', 'mem', 'typ', 'skt'];
// Filter attrubutes
var filters = attrs.concat('mrk');
// Array of lists for each attributes,
// each list contains sets mapping from each attribute value to card numbers
var sets = [];
// List of current filtering sets for each attribute
var filterVal = [];
// List of current filtered cards for each attribute
var filterCrd = [];

// List of cards as DOM object, indexed by card number
var cardmap = [];
// List of displaying card numbers
var keys = [];
// Set of all card numbers
var allkeys;
// Set of marked card
var markCrd = new Set();

// List of sorting weight for different attributes
var _sortv = [];


/************************************************
 *  Data Loading Function
 */

function init() {
    
    // Initialization of  global variables    
    for (let attr of attrs) {
        sets[attr] = [];
    }
    
    sets['mrk'] = new Set();
    
    // Update global sets and filters from card data
    for (let card of cards)  {
        
        let key = card['cno'];
        keys.push(key);
        
        // Create DOM object
        let tr = $("<tr></tr>");
        tr.attr({'id': 'tr-'+card['cno']});
        tr.append($("<td></td>")
          .addClass('td-img')
          .append(
              $("<img></img>").attr({
                  '_src': card['img'],
                  'src': 'about:blank'
              })
          .addClass('hidden')
        ));
        tr.append($("<td></td>").addClass('td-cno').append(card['cno']));
        tr.append($("<td></td>").addClass('td-mem').append(card['mem']));
        tr.append($("<td></td>").addClass('td-skn').append(card['skn']));
        tr.append($("<td></td>").addClass('td-rar').append(card['rar']));
        tr.append($("<td></td>").addClass('td-grp').append(card['grp']));
        tr.append($("<td></td>").addClass('td-typ').append(card['typ']));
        let ptyps = ['hp', 'sp', 'pp', 'cp'];
        for (let i = 1; i <= 3; i++) {
            for (let ptyp of ptyps) {
                let p = ptyp+i.toString();
                tr.append($("<td></td>").addClass('td-'+ptyp+' td-'+p).append(card[p]));
            }
        }
        tr.append($("<td></td>").addClass('td-skt').append(card['skt']));
        tr.append($("<td></td>").addClass('td-skc').append(card['skc']));
        tr.append($("<td></td>").addClass('td-skp').append(card['skp']));
        tr.append($("<td></td>").addClass('td-ske').append(card['ske']));
        switch (card['typ']) {
            case 'スマイル': tr.addClass('tr-smile'); break;
            case 'ピュア'  : tr.addClass('tr-pure');  break;
            case 'クール'  : tr.addClass('tr-cool');  break;
            default:
        }
        // Get DOM object from jQuery object
        cardmap[key] = tr[0];
        
        // Update sets and filters
        for (let attr of attrs) {
            let val = card[attr];
            if (!(val in sets[attr])) sets[attr][val] = new Set();
            sets[attr][val].add(key);
        }
    }
    cards = null;
    allkeys = new Set(keys);
    for (let attr of attrs) {
        filterVal[attr] = new Set(Object.keys(sets[attr]));
        filterCrd[attr] = new Set(keys);
    }
    filterCrd['mrk'] = new Set(allkeys);
    
    // Add clickable appearance on some headers
    $('.th-sort').each(function(){
        $("span", this).replaceWith(
            $('<span></span').append(
                $('<button></button>').attr({'type':'button'}).addClass('btn btn-link').text($("span", this).text())
            )
        );
    });
    
    _sortv['mem'] = [];
    let _mem = ['高坂穂乃果','絢瀬絵里','南ことり','園田海未','星空凛','西木野真姫','東條希','小泉花陽','矢澤にこ',
                '高海千歌','桜内梨子','松浦果南','黒澤ダイヤ','渡辺曜','津島善子','国木田花丸','小原鞠莉','黒澤ルビィ'];
    for (let i = 0; i <_mem.length; i++)
        _sortv['mem'][_mem[i]] = i-_mem.length;
    _sortv['rar'] = {'SR':6, 'SSR':8, 'UR':10};
    _sortv['grp'] = {"μ's":-2, 'Aqours':-1};
    _sortv['typ'] = {'スマイル':-3 ,'ピュア':-2, 'クール':-1};
    _sortv['skt'] = {'スコア':-3, '判定':-2, '体力':-1};
    
    // Update filter selection lists
    let addbtn = function(attr, text) {
        let button = $('<button></button>').attr({'type': 'button', 'attr': attr}).addClass('btn btn-link btn-block').text(text);
        $('#dropdown-'+attr).append($('<li></li>').append(button));
        return button;
    }
    for (let attr of attrs) {
        addbtn(attr, '全選').addClass('btn-filter filter-all').attr({'op': 'add'});
        addbtn(attr, '清除').addClass('btn-filter filter-all').attr({'op': 'clr'});
        let vals = Array.from(Object.keys(sets[attr]));
        let _cmp = function(attr, reverse) {
            return function(a, b) {
                return (_sortv[attr][a]-_sortv[attr][b])*(reverse?-1:1);
            };
        };
        let _r = function(attr) {
            switch (attr) {
                case 'rar': return true;
                default: return false;
            }
        };
        vals.sort(_cmp(attr, _r(attr)));
        for (let val of vals) {
            addbtn(attr, val).addClass('btn-filter filter-'+attr);
        }
    }
};

function refreshRow() {
    let trs = [];
    for (let key of keys)
        trs.push(cardmap[key]);
    $('#table-cards tbody').empty().append(trs);
}


/************************************************
 * Sorting Function
 */

function sortKeys(by) {
    
    let _cmp = function(by, reverse) {
        let c = reverse?-1:1;
        switch (by) {
            case 'cno':
                return function(a, b) { return (a-b)*c; };
            case 'mem': case 'rar': case 'grp': case 'typ': case 'skt':
                return function(a, b) {
                    let _a = cardmap[a].getElementsByClassName('td-'+by)[0].textContent;
                    let _b = cardmap[b].getElementsByClassName('td-'+by)[0].textContent;
                    let ret = (_sortv[by][_a]-_sortv[by][_b])*c;
                    if (ret == 0) return a-b;
                    return ret;
                };
            case 'skp':
                return function(a, b) {
                    let _a = cardmap[a].getElementsByClassName('td-'+by)[0].textContent.replace('%', '');
                    let _b = cardmap[b].getElementsByClassName('td-'+by)[0].textContent.replace('%', '');
                    let ret = (_a-_b)*c;
                    if (ret == 0) return a-b;
                    return ret;
                };
            case 'skc':
                return function(a, b) {
                    let _a = cardmap[a].getElementsByClassName('td-'+by)[0].textContent.split(/(\d+)/).filter(Boolean)[0];
                    let _b = cardmap[b].getElementsByClassName('td-'+by)[0].textContent.split(/(\d+)/).filter(Boolean)[0];
                    let ret = (_a-_b)*c;
                    if (ret == 0) return a-b;
                    return ret;
                };
            default:
                return function(a, b) {
                    let _a = cardmap[a].getElementsByClassName('td-'+by)[0].textContent;
                    let _b = cardmap[b].getElementsByClassName('td-'+by)[0].textContent;
                    let ret = (_a-_b)*c;
                    if (ret == 0) return a-b;
                    return ret;
                };
        }
    };
    
    let _r = function(by) {
        switch (by) {
            case 'cno': case 'mem': case 'grp': case 'typ': case 'skt': case 'skc': return false;
            default: return true;
        }};
    
    keys.sort(_cmp(by, _r(by)));
    
    $('#th-'+sortMethod).removeClass('info');
    $('.td-'+sortMethod).removeClass('info');
    sortMethod = by;
    
    refreshRow();
    
    $('#th-'+sortMethod).addClass('info');
    $('.td-'+sortMethod).addClass('info');
}


/************************************************
 * On-click Functions
 */

// Trick found from http://stackoverflow.com/a/34518988
$(document).on('click', '.dropdown-menu', function(e) {
    if ($(this).hasClass('keep-open-on-click')) e.stopPropagation();
});

$(document).on('click', '#btn-loadimg', function() {
    if (boolHideImg) {
        for (let card of cardmap) {
            var obj = $(card);
            var img = obj.find('.td-img img');
            img.attr('src', img.attr('_src'))
                .removeAttr('_src')
                .removeClass('hidden');
            card = obj[0];
        }
        $(this).addClass('hidden');
        boolHideImg = false;
    }
});

$(document).on('click', '.btn-unavilable', function() {
    window.alert('尚未支援! \\(°Д° )/');
});

$(document).on('click', '.th-sort', function() {
    return sortKeys($(this).attr('id').split('-')[1]);
});

function filterHandler(op, attr, val) {
    /*
    # op: 'add', 'clr', 'toggle'
    # attr: one of attrs, or 'mrk' => filters
    # val: attribute value, or 'all'
    
    # Handle toggle
    0.check if it is add or clr
    
    # Handle add
    1. add val to filtering set
    2. list cards to be added (delta) and add to filtered cards
    3. remove elements in delta not satisfying other filters
    4. add these card and sort again
    5. toggle filter-disable of buttons with filtering set has()
    
    # Handle clr
    1. remove val from filtering set
    2. list cards to be deleted (delta) and remove from filtered cards
    3. remove the cards appeared in delta
    4. toggle filter-disable of buttons with filtering set has()
    */
    
    if (attrs.indexOf(attr) != -1) {
        if (op === 'toggle')
            op = filterVal[attr].has(val) ? 'clr' : 'add'; 
        
        let prevsize = filterVal[attr].size, maxsize = Object.keys(sets[attr]).length;
        
        let delta, deltavalues;
        if (op === 'add') {
            if (val === 'all') {
                let allvalues = Object.keys(sets[attr]);
                deltavalues = setOps.complement(allvalues, filterVal[attr]);
                delta = setOps.complement(allkeys, filterCrd[attr]);
                filterVal[attr] = new Set(allvalues);
                filterCrd[attr] = new Set(allkeys);
            }
            else {
                deltavalues = [val];
                delta = Array.from(sets[attr][val]);
                filterVal[attr].add(val);
                filterCrd[attr] = new Set(setOps.union(filterCrd[attr], delta));
            }
            for (let _filter of filters) {
                if (attr === _filter) continue;
                if (filterCrd[_filter].size == allkeys.length) continue;
                delta = setOps.intersection(delta, filterCrd[_filter]);
            }
            if (delta.length > 0) {
                Array.prototype.push.apply(keys, delta);
                sortKeys(sortMethod);
                }
        }
        else if (op === 'clr') {
            if (val === 'all') {
                deltavalues = Array.from(filterVal[attr]);
                delta = Array.from(filterCrd[attr]);
                filterVal[attr].clear();
                filterCrd[attr].clear();
            }
            else {
                deltavalues = [val];
                delta = sets[attr][val];
                filterVal[attr].delete(val);
                filterCrd[attr] = new Set(setOps.complement(filterCrd[attr], delta));
            }
            keys = setOps.complement(keys, delta);
            sortKeys(sortMethod);
        }
        $('.filter-'+attr).filter(
            function(idx) { return deltavalues.indexOf($(this).text()) != -1; }
        ).toggleClass('filter-disable');
        
        let currsize = filterVal[attr].size;
        if (currsize == maxsize)
            $('.btn-'+attr).removeClass('btn-secondary btn-warning').addClass('btn-info');
        else if (currsize == 0)
            $('.btn-'+attr).removeClass('btn-warning btn-info').addClass('btn-secondary');
        else
            $('.btn-'+attr).removeClass('btn-info btn-secondary').addClass('btn-warning');
        
    }
    else if (attr === 'mrk') {
        
        // Update after changing some mark?
        
        
                
        if (op === 'toggle')
            op = $('.filter-mrk').hasClass('filter-disable') ? 'add' : 'clr';
        if (op === 'add') {
            filterCrd[attr] = new Set(sets['mrk']);
            keys = setOps.intersection(keys, sets['mrk']);
            sortKeys(sortMethod);
            $('.filter-mrk').removeClass('filter-disable');
        }
        else if (op === 'clr') {
            let delta = setOps.complement(allkeys, sets['mrk']);
            filterCrd[attr] = new Set(allkeys);
            for (let _filter of filters) {
                if (attr === _filter) continue;
                if (filterCrd[_filter].size == allkeys.length) continue;
                delta = setOps.intersection(delta, filterCrd[_filter]);
            }
            if (delta.length > 0) {
                Array.prototype.push.apply(keys, delta);
                sortKeys(sortMethod);
            }
            $('.filter-mrk').addClass('filter-disable');
        }
    }
}

$(document).on('click', '.btn-filter', function(e) {
    if ($(this).hasClass('filter-all'))
        filterHandler($(this).attr('op'), $(this).attr('attr'), 'all');
    else
        filterHandler('toggle', $(this).attr('attr'), $(this).text());
});

function markHandler(op, key) {
    console.log('markHandler():',op,key);
    
    // op: 'add', 'clr', 'toggle'
    // key: 'all', 'page', card number
    if (op === 'toggle' && !(key === 'all' || key === 'page'))
        op = sets['mrk'].has(key) ? 'clr' : 'add';
    
    let delta;
    if (op === 'add') {
        switch (key) {
            case 'all':
                delta = setOps.complement(allkeys, sets['mrk']);
                sets['mrk'] = new Set(allkeys);
                break;
            case 'page':
                delta = setOps.complement(keys, sets['mrk']);
                sets['mrk'] = new Set(keys);
                break;
            default:
                delta = [key];
                sets['mrk'].add(key);
        }
    }
    else if (op === 'clr') {
        switch (key) {
            case 'all':
                delta = Array.from(sets['mrk']);
                sets['mrk'] = new Set();
                break;
            case 'page':
                delta = setOps.intersection(keys, sets['mrk']);
                sets['mrk'] = new Set(setOps.complement(sets['mrk'], keys));
                break;
            default:
                delta = [key];
                sets['mrk'].delete(key);
        }
    }
    else if (op === 'toggle') {
        delta = Array.from(key === 'all' ? allkeys : keys);
        sets['mrk'] = new Set(setOps.difference(delta, sets['mrk']));
    }
    delta.forEach(function (e) {
        $('#tr-'+e).toggleClass('success');
    });
}
    
$(document).on('click', '#table-cards tr .td-skn', function() {
    markHandler('toggle', $(this).parents('tr').attr('id').split('-')[1]);
});

$(document).on('click', '#dropdown-mrk button.mrk-args', function() {
    markHandler(...$(this).attr('args').split('-'));
});

$(document).on("click", "#span-msg", function() {
    $("#span-msg").text(null);
});


/************************************************
 * Get/Set Cookie Function
 */

function setCookie(cname, cvalue, exdays) {
    let d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
    console.log(cname + "=" + cvalue + "; " + expires);
}

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}


/************************************************
 * Functions to serialize lists
 */

// TODO


/************************************************
 * Other Functions
 */

function updateMT() {
    var getMTime = function(url, callback) {
        var protocol = window.location.href.split(":")[0];
        if (protocol != "http" && protocol != "https") {
            callback();
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true); // use HEAD
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var mtime = new Date(xhr.getResponseHeader('Last-Modified'));
                if (mtime.toString() === 'Invalid Date') {
                    callback(); // dont want to return a bad date
                } else {
                    callback(mtime);
                }
            }
        }
        xhr.send();
    };
    try {
        getMTime('cards.js', function(mtime) {
            if (mtime) {
                var date = new Date(mtime);
                $("#span-update").text(date.toString());
            }
            else $("#span-update").text("載入失敗");
        });
    } catch(e) {
        $("#span-update").text("載入失敗，壞掉啦");
    }
}


/************************************************
 * Document Ready Function
 */

$(document).ready(function() {

    init();
    updateMT();
    sortKeys('cno');
    if (!boolHideImg) $("#btn-loadimg").click(); // lol
	
});

