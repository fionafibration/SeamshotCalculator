var SeamshotWorker = null;
var bspFile = null;
var sarMode = true;

function log(msg) {
    document.querySelector("#log").innerHTML = msg;
}

function sarModechange() {
    sarMode = document.getElementById('sar_mode').checked;
}


function requestBSPFile() {
    if (bspFile == null) {
        bspFile = document.createElement('input');
        bspFile.setAttribute('type', 'file');
        bspFile.setAttribute('accept', ".bsp");
        bspFile.style.display = 'none';
        document.body.appendChild(bspFile);

        bspFile.onchange = () => {
            let name = "Choose a BSP map file."
            if(bspFile.files && bspFile.files[0]){
                name = bspFile.files[0].name;
            }
            document.querySelector("#bspFileInput").value = name;
            document.querySelector("#bspFileLoad").disabled = false;
            
        }
    }
    bspFile.click();
}


function loadFile() {
    if (typeof window.FileReader !== 'function') {
        log("Error: FileReader API isn't supported on this browser.");
        return;
    }

    if (!window.Worker) {
        log("Error: Web Worker isn't supported in this browser.");
        return;
    }

    if (SeamshotWorker != null) {
        log("Error: Web Worker is processing something already.");
        return;
    }

    if(!bspFile || !bspFile.files || !bspFile.files[0]){
        log("Error: File could not be loaded.");
        return;
    }

    document.querySelector("#bspFileInput").disabled = true;
    document.querySelector("#bspFileLoad").disabled = true;
    
    let file = bspFile.files[0];
    let fr = new FileReader();
    fr.onload = function () {

        SeamshotWorker = new Worker('scripts/seamshot-finder.js');
        
        SeamshotWorker.onmessage = function (e) {
            if (typeof (e.data) == "string") {
                log(e.data);
            } else {
                let filename = file.name.split(".")[0] + "_seams.cfg";
                outputSeamshotsIntoFile(e.data, filename);
                SeamshotWorker = null;
                document.querySelector("#bspFileInput").disabled = false;
                document.querySelector("#bspFileLoad").disabled = false;
            }
        }

        SeamshotWorker.postMessage(fr.result);
    };
    fr.readAsArrayBuffer(file);
}


function round(num, places) {
    return Math.round((num + Number.EPSILON) * (Math.pow(10, places))) / (Math.pow(10, places))
}

// converts seamshot array into a drawline commands string, then requests download.
function outputSeamshotsIntoFile(seamshots, filename) {
    let r = 2
    let output = "";
    if (sarMode) {
        for (let seamshot of seamshots) {
            output +=
                "sar_drawline "
                + round(seamshot.point1.x, r) + " " + round(seamshot.point1.y, r) + " " + round(seamshot.point1.z, r) + " "
                + round(seamshot.point2.x, r) + " " + round(seamshot.point2.y, r) + " " + round(seamshot.point2.z, r) + " "
                + (seamshot.planenum > 1 ? "0 255 0" : (seamshot.type == 0 ? "255 150 0" : "255 0 0"))
                + "\n";
        }
    }

    // default source engine drawline maxes at 20
    // step through batches of 20 drawline commands at once
    // user can bind drawline_next and drawline_prev
    else {
        output += "// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n// Source drawline is limited to 20 lines at one time\n// Bind these aliases to step through batches\n"
        output += "bind mwheelup dl_n // next\nbind wheeldown dl_p // prev\n"
        // gotta be short to avoid command length limit
        // next and previous
        output += "alias dl_n drb0" + "\n";
        output += "alias dl_p \"\"" + "\n\n\n";


        // draw batch
        for (let i = 0; i * 5 < seamshots.length; i += 1) {
            output += "alias drb" + i + " \"";

            for (let j = 0; j < 5 && (i * 5 + j) < seamshots.length; j++) {
                let seamshot = seamshots[i * 5 + j];
                output += "drawline "
                    + round(seamshot.point1.x, r) + " " + round(seamshot.point1.y, r) + " " + round(seamshot.point1.z, r) + " "
                    + round(seamshot.point2.x, r) + " " + round(seamshot.point2.y, r) + " " + round(seamshot.point2.z, r) + " "
                    + (seamshot.planenum > 1 ? "0 255 0" : (seamshot.type == 0 ? "255 150 0" : "255 0 0"))
                    + "; ";
            }
            // set our aliases
            if (i !== 0) {
                output += "alias dl_p drb" + (i - 1) + "; ";
            }
            output += "alias dl_n drb" + (i + 1) + "; ";
            output += "\"\n"
        }
    }

    download(filename, output);
}


// download text in a file.
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
