var editor = ace.edit("editor");
var tabData = {};
var currentTabId;
var currentTabData;
var csdSkel = "<CsoundSynthesizer>\n<CsInstruments>\n\n</CsInstruments>\n" +
  "<CsScore>\n\n</CsScore>\n</CsoundSynthesizer>\n";
var csdObj;
var tempCsdReady = false;
var tempCsdCopying = false;

function currentTabToTempCsd() {
  if (typeof currentTabData.session === 'undefined') return;
  var contents = currentTabData.session.getValue();
  var blob = new Blob([contents], {type: 'text/plain'});
  var objectURL = URL.createObjectURL(blob);
  csound.CopyUrlToLocal(objectURL,"temp.csd");
  currentTabData.inTempCsd = true;
  tempCsdCopying = true;
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
  if (currentTabData.inTempCsd) currentTabData.inTempCsd = false;
  if (currentTabData.dirty) return;
  if (typeof currentTabData.fileEntry !== 'undefined') {
    $('#saveButton').button("option", "disabled", false);
  }
  //$('#saveAsButton').button("option", "disabled", false);
  currentTabData.dirty = true;
}

function unsetDirty() {
  console.log('entering unsetDirty()');
  if ("dirty" in currentTabData && !currentTabData.dirty) return;
  $('#saveButton').button("option", "disabled", true);
  //$('#saveAsButton').button("option", "disabled", true);
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
      unsetDirty();
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
  if (typeof currentTabData === 'undefined') {
    if (tempCsdReady) restartCsound();
    return;
  }
  if (currentTabData.inTempCsd && tempCsdReady) {
    restartCsound();
    return;
  }
  currentTabToTempCsd();
}

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
      if (typeof currentTabData === 'undefined') {
        $('#saveButton').button("option", "disabled", true);
        $('#saveAsButton').button("option", "disabled", true);
      } else {
        editor.setSession(currentTabData.session);
        $('#saveAsButton').button("option", "enabled", true);
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
  if (tempCsdReady) {
    $('div#tabs').tabs('option', 'active', 0);
    csound.PlayCsd("./local/temp.csd");
  }
}

function handleMessage(message) {
  if (tempCsdCopying) {
    if (message.data == "Complete") {
      tempCsdCopying = false;
      tempCsdReady = true;
      restartCsound();
    }
    return;
  }
  $('#csound_output').append(message.data);
  $('#csound_output').scrollTop(99999); // focus on bottom
}

$(window).resize(function() {
  console.log('resize handler called');
  $('div#tabs').tabs('refresh');
});

$('document').ready(function() {
  editor.setTheme("ace/theme/textmate");
  configureControls();
  configureTabs();
});
