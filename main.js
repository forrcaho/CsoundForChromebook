var editor = ace.edit("editor");
var tabData = {};
var currentTabId;
var currentTabData;
var csdSkel = "<CsoundSynthesizer>\n<CsInstruments>\n\n</CsInstruments>\n" +
  "<CsScore>\n\n</CsScore>\n</CsoundSynthesizer>\n";
//var csdFileEntry;
var csdObj;

function parseCsd(text) {
  var csdObj = {};
  var match = /<CsoundSynthesizer>([\s\S]*?)<\/CsoundSynthesizer>/.exec(text);
  if (match === null) {
    console.log('no <CsoundSynthesizer> tags found in parseCsd');
    return csdObj;
  }
  var innerText = match[1];
  var sectionRE = /<([^>]+)>([\s\S]*?)<\/\1>/g;
  while ( (match = sectionRE.exec(innerText)) !== null) {
    var section = match[1];
    var contents = match[2].replace(/^\s*/, '');
    csdObj[section] = contents;
  }
  return csdObj;
}

function restartCsound() {
  csound.destroyModule();
  csound.attachDefaultListeners();
  csound.createModule();
}

function handleError(e) {
  // TODO: should display this to user somehow
  console.log(e);
}

function setDirty() {
  console.log('entering setDirty()');
  if (currentTabData.dirty) return;
  if (typeof currentTabData.fileEntry !== 'undefined') {
    $('#saveButton').button("option", "disabled", false);
  }
  $('#saveAsButton').button("option", "disabled", false);
  currentTabData.dirty = true;
}

function unsetDirty() {
  console.log('entering unsetDirty()');
  if (!currentTabData.dirty) return;
  $('#saveButton').button("option", "disabled", true);
  $('#saveAsButton').button("option", "disabled", true);
  currentTabData.dirty = false;
}

function saveCsd() {
  currentTabData.fileEntry.createWriter(function(writer) {
    writer.onerror = handleError;
    // http://stackoverflow.com/questions/6792607/using-the-html5-filewriter-truncate-method
    var truncated = false;
    writer.onwrite = function(e) {
      if (!truncated) {
        truncated = true;
        this.truncate(this.position);
      }
      unsetDirty(tabId);
    };
    var contents = currentTabData.session.getValue();
    var blob = new Blob([contents], {type: 'text/plain'});
    writer.write(blob);
  }, handleError);
}

function saveHandler() {
  saveCsd();
}

function saveAsHandler() {
  chrome.fileSystem.chooseEntry(
    {
      type: "saveFile",
      suggestedName: (typeof currentTabData.fileEntry === 'undefined') ?
        'untitled.csd' : currentTabData.fileEntry.name,
      accepts: [
        { extensions: [ "csd" ] },
      ]
    },
    function(fe) {
      if (fe) {
        currentTabData.fileEntry = fe;
        $('li#' + currentTabId + ' a').text(fe.name);
       // document.querySelector('#filename').innerText = fe.name;
        saveCsd();
      }
    }
  );
}

function openHandler() {
  console.log('openHandler called');
  addTab();
  chrome.fileSystem.chooseEntry(
    {
      type: "openFile"
    },
    function(fe) {
      fe.file(
        function(file) {
          var reader = new FileReader();
          reader.onerror = handleError;
          reader.onload = function() {
            currentTabData.session.removeListener("change", setDirty);
            currentTabData.session.setValue(reader.result);
            currentTabData.session.on("change", setDirty);
          };
          reader.readAsText(file);
        }, handleError
      );
      if (fe) {
        currentTabData.fileEntry = fe;
        $('li#' + currentTabId + ' a').text(fe.name);
        //document.querySelector('#filename').innerText = fe.name;
        unsetDirty();
      }
    }
  );
}

function newHandler() {
  // create new tab with skel csd
  addTab();
  currentTabData.session.setValue(csdSkel);
  unsetDirty();
}

function playCsdHandler() {
  console.log('playCsdHandler entered');
  csdObj = parseCsd(currentTabData.session.getValue());
  restartCsound();
}

/*
function configureEditor() {
  editor.setTheme("ace/theme/textmate");
  editor.getSession().setMode("ace/mode/csound");
  editor.getSession().on("change", setDirty);
}
*/

function configureControls() {
  $('#newButton').button().on("click", newHandler);
  $('#saveButton').button().on("click", saveHandler);
  $('#saveAsButton').button().on("click", saveAsHandler);
  $('#openButton').button().on("click", openHandler);
  $('#playCsdButton').button().on("click", playCsdHandler);
}

var tabCounter = 0;
function addTab() {
  tabCounter++;
  var tabId = "tab" + tabCounter;
  console.log("adding " + tabId);
  $('div#tabs ul').append('<li id="' + tabId + '"><a href="#editor">'
        + 'untitled' + (tabCounter === 1 ? '' : tabCounter) + '.csd' 
        + '</a><span id="close' + tabCounter + '" class="closetab ui-icon ui-icon-closethick"></span></li>');
        $('span#close' + tabCounter).on('mouseover', function() {
          $(this).css('background-color', '#f66');
        });
        $('span#close' + tabCounter).on('mouseout', function() {
          $(this).css('background-color', '');
        });
        $('span#close' + tabCounter).on('click', function() {
          // TODO: ask to save if dirty
          $(this).closest('li').remove();
          delete tabData[tabId];
          $('div#tabs').tabs('refresh');
        });
        
        tabData[tabId] = {};
        tabData[tabId].session = ace.createEditSession("", "ace/mode/csound");
        editor.setSession(tabData[tabId].session);
        $('div#tabs').tabs('refresh');
        editor.resize(true); // first tab needs this to fill panel
        $('div#tabs').tabs('option', 'active', -1);
        
        currentTabId = tabId;
        currentTabData = tabData[tabId];
}

function configureTabs() {
  $('div#tabs').tabs({
    heightStyle: 'fill',
    activate: function (event, ui) {
      // switch to correct editor session
      currentTabId = ui.newTab.attr("id");
      currentTabData = tabData[currentTabId];
      if (typeof currentTabData !== 'undefined') {
        editor.setSession(currentTabData.session);
        if (currentTabData.dirty) {
          setDirty();
        } else {
          unsetDirty();
        }
      }
    }
  });
}

function moduleDidLoad() {
  $('#title').text('Csound for Chromebook');
  console.log("csound module loaded");
  if (typeof csdObj !== 'undefined') {
    csound.Play();
    csound.CompileOrc(csdObj.CsInstruments);
    csound.ReadScore(csdObj.CsScore);
  }
}

var csoundMessageCount = 0;
function handleMessage(message) {
  $('#csound_output').append(message.data);
  $('#csound_output').scrollTop(99999); // focus on bottom
  if (csoundMessageCount++ >= 1000) {
    $('#csound_output').text(' ');
    csoundMessageCount = 0;
  }
}

$(window).resize(function() {
  console.log('resize handler called');
  $('div#tabs').tabs('refresh');
});

$('document').ready(function() {
  editor.setTheme("ace/theme/textmate");
  configureControls();
  configureTabs();
  //unsetDirty();
});
