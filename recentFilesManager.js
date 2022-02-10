const { Gtk, Gio, GLib } = imports.gi;
const Main = imports.ui.main;

const LogEnabled = false;
const RecentManager = new Gtk.RecentManager();

function filterRecentFiles(callback){
    RecentManager.get_items().sort((a, b) => b.get_modified() - a.get_modified())
    .forEach(item => {
        queryFileExists(item)
        .then(validFile =>{
            debugLog("Valid file - " + validFile.get_display_name());
            callback(validFile);
        })
        .catch(err =>{
            debugLog(err);
        });
    });
}

function queryFileExists(item) {
    return new Promise((resolve, reject) => {
        let file = Gio.File.new_for_uri(item.get_uri());
        let cancellable = new Gio.Cancellable();

        if(file === null)
            reject("Recent file is null. Rejected.");

        //Assume query_info_async() will throw error if not resolved before set elapsed time.
        //Cancel the query and reject the promise if elapsed time reached.
        let timeOutID = GLib.timeout_add(0, 1000, () => {
            cancellable.cancel();
            reject('query_info_async() timed out - ' + item.get_display_name());
            timeOutID = null;
            return GLib.SOURCE_REMOVE;
        });

        file.query_info_async('standard::type', 0, 0, cancellable, (o, res) => {
            try {
                let fileInfo = file.query_info_finish(res);
                if (fileInfo) {
                    if (timeOutID) {
                        GLib.source_remove(timeOutID);
                        timeOutID = null;
                    }
                    resolve(item);
                }
            }
            catch (err) {
                if (timeOutID) {
                    GLib.source_remove(timeOutID);
                    timeOutID = null;
                }
                reject(err);
            }
        });
    });
}

function getRecentManager(){
    return RecentManager;
}

function debugLog(message){
    if (!LogEnabled)
        return;
    else log(message);
}
