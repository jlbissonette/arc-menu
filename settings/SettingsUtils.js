const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Gio, GLib, Gdk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

function getMenuLayoutTweaksName(index){
    for(let styles of Constants.MenuStyles.STYLES){
        for(let style of styles.MENU_TYPE){
            if(style.LAYOUT == index){
                return _("%s Layout Tweaks").format(_(style.TITLE));
            }
        }
    }
}

var MenuLayout = {
    ARCMENU: 0,//
    BRISK: 1, //
    WHISKER: 2, //
    GNOME_MENU: 3, //
    MINT: 4, //
    ELEMENTARY: 5, //
    GNOME_OVERVIEW: 6, //
    REDMOND: 7, //
    UNITY: 8, //
    BUDGIE: 9, //
    INSIDER: 10, //
    RUNNER: 11, //
    CHROMEBOOK: 12, //
    RAVEN: 13, //
    TOGNEE: 14, //
    PLASMA: 15, //
    WINDOWS: 16, //
    ELEVEN: 17, //
    AZ: 18, //
};

Constants.SettingsPage.PINNED_APPS
Constants.SettingsPage.APPLICATION_SHORTCUTS
Constants.SettingsPage.DIRECTORY_SHORTCUTS
Constants.SettingsPage.POWER_OPTIONS
Constants.SettingsPage.EXTRA_CATEGORIES
Constants.SettingsPage.SEARCH_OPTIONS

function setVisibleRows(rows, menuLayout) {
    for (let row in rows)
        rows[row].visible = true;

    switch(menuLayout) {
        case Constants.MenuLayout.PLASMA:
        case Constants.MenuLayout.TOGNEE:
        case Constants.MenuLayout.ARCMENU:
            break;
        case Constants.MenuLayout.ELEVEN:
        case Constants.MenuLayout.AZ:
        case Constants.MenuLayout.INSIDER:
            rows[Constants.SettingsPage.DIRECTORY_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.APPLICATION_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.EXTRA_CATEGORIES].visible = false;
            break;
        case Constants.MenuLayout.WHISKER:
        case Constants.MenuLayout.BRISK:
            rows[Constants.SettingsPage.DIRECTORY_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.APPLICATION_SHORTCUTS].visible = false;
            break;
        case Constants.MenuLayout.GNOME_MENU:
            rows[Constants.SettingsPage.DIRECTORY_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.APPLICATION_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.SEARCH_OPTIONS].visible = false;
            rows[Constants.SettingsPage.POWER_OPTIONS].visible = false;
            break;
        case Constants.MenuLayout.MINT:
        case Constants.MenuLayout.BUDGIE:
            rows[Constants.SettingsPage.DIRECTORY_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.APPLICATION_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.POWER_OPTIONS].visible = false;
            break;
        case Constants.MenuLayout.RAVEN:
        case Constants.MenuLayout.UNITY:
            rows[Constants.SettingsPage.DIRECTORY_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.POWER_OPTIONS].visible = false;
            break;
        case Constants.MenuLayout.ELEMENTARY:
        case Constants.MenuLayout.CHROMEBOOK:
        case Constants.MenuLayout.RUNNER:
            rows[Constants.SettingsPage.PINNED_APPS].visible = false;
            rows[Constants.SettingsPage.APPLICATION_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.DIRECTORY_SHORTCUTS].visible = false;
            rows[Constants.SettingsPage.POWER_OPTIONS].visible = false;
            rows[Constants.SettingsPage.EXTRA_CATEGORIES].visible = false;
            break;
        case Constants.MenuLayout.REDMOND:
        case Constants.MenuLayout.WINDOWS:
            rows[Constants.SettingsPage.EXTRA_CATEGORIES].visible = false;
            break;
        case Constants.MenuLayout.GNOME_OVERVIEW:
            for (let row in rows)
                rows[row].visible = false;
            break;
        default:
            break;
    }
}

function parseRGBA(colorString){
    let rgba = new Gdk.RGBA();
    rgba.parse(colorString);
    return rgba;
}

function createXpmImage(color1, color2, color3, color4){
    color1 = rgbToHex(parseRGBA(color1));
    color2 = rgbToHex(parseRGBA(color2));
    color3 = rgbToHex(parseRGBA(color3));
    color4 = rgbToHex(parseRGBA(color4));
    let width = 42;
    let height = 14;
    let nColors = 5;

    let xpmData = [`${width} ${height} ${nColors} 1`, `1 c ${color1}`, `2 c ${color2}`,
                    `3 c ${color3}`, `4 c ${color4}`, `x c #AAAAAA`]

    xpmData.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

    for(let i = 0; i < height - 2; i++)
        xpmData.push("x1111111111222222222233333333334444444444x");

    xpmData.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

    return xpmData;
}

function rgbToHex(color) {
    let [r, g, b, a_] = [Math.round(color.red * 255), Math.round(color.green * 255), Math.round(color.blue * 255), Math.round(color.alpha * 255)];
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getIconStringFromListing(listing){
    let path;
    const shortcutCommand = listing[2];
    const shortcutIconName = listing[1];

    switch(shortcutCommand){
        case Constants.ShortcutCommands.DOCUMENTS:
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
            break;
        case Constants.ShortcutCommands.DOWNLOADS:
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
            break;
        case Constants.ShortcutCommands.MUSIC:
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC);
            break;
        case Constants.ShortcutCommands.PICTURES:
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
            break;
        case Constants.ShortcutCommands.VIDEOS:
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS);
            break;
        case Constants.ShortcutCommands.HOME:
            path = GLib.get_home_dir();
            break;
        case Constants.ShortcutCommands.NETWORK:
            return 'network-workgroup-symbolic';
        case Constants.ShortcutCommands.COMPUTER:
            return 'drive-harddisk-symbolic';
        case Constants.ShortcutCommands.RECENT:
            return 'document-open-recent-symbolic';
        default:
            path = shortcutCommand ?? shortcutIconName;
    }

    if(!path)
        return shortcutIconName;

    let file = Gio.File.new_for_path(path);

    if(!file.query_exists(null))
        return shortcutIconName;

    try{
        let info = file.query_info('standard::symbolic-icon', 0, null);
        return info.get_symbolic_icon().to_string();
    }
    catch(e){
        if(e instanceof Gio.IOErrorEnum){
            if(!file.is_native())
                return new Gio.ThemedIcon({name: 'folder-remote-symbolic'}).to_string();
            else
                return new Gio.ThemedIcon({name: 'folder-symbolic'}).to_string();
        }
    }
}