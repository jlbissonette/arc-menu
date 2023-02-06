const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const PW = Me.imports.prefsWidgets;
const { SettingsUtils } = Me.imports.settings;
const _ = Gettext.gettext;

const Settings = Me.imports.settings;
const { SubPage } = Settings.Menu.SubPage;

var ListPinnedPage = GObject.registerClass(
class ArcMenu_ListPinnedPage extends SubPage {
    _init(settings, params) {
        super._init(settings, params);

        if(this.list_type === Constants.MenuSettingsListType.EXTRA_SHORTCUTS)
            this.spacing = 24;

        this._settings = settings;
        this.frameRows = [];
        let shortcutsDataArray = [];
        let addMoreTitle;

        this.frame = new Adw.PreferencesGroup();

        this.add(this.frame);

        const nestedArraySetting = this.list_type !== Constants.MenuSettingsListType.PINNED_APPS;

        if(this.list_type === Constants.MenuSettingsListType.PINNED_APPS){
            this.settingString = 'pinned-app-list';
            addMoreTitle = _("Add More Apps");
        }
        else if(this.list_type === Constants.MenuSettingsListType.CONTEXT_MENU){
            this.settingString = 'context-menu-shortcuts';
            addMoreTitle = _("Add More Apps");
        }
        else if(this.list_type === Constants.MenuSettingsListType.DIRECTORIES){
            this.settingString = 'directory-shortcuts-list';
            addMoreTitle = _("Add Default User Directories");
        }
        else if(this.list_type === Constants.MenuSettingsListType.APPLICATIONS){
            this.settingString = 'application-shortcuts-list';
            addMoreTitle = _("Add More Apps");
        }
        else if(this.list_type === Constants.MenuSettingsListType.EXTRA_SHORTCUTS){
            this.settingString = this.setting_string;
            addMoreTitle = _("Add More Shortcuts");
        }

        const shortcutsArray = this._settings.get_value(this.settingString).deep_unpack();
        if(nestedArraySetting){
            for(let i = 0; i < shortcutsArray.length; i++){
                shortcutsDataArray.push({
                    name: shortcutsArray[i][0],
                    icon: shortcutsArray[i][1],
                    command: shortcutsArray[i][2]
                });
            }
        }
        else{
            for(let i = 0; i < shortcutsArray.length; i+=3){
                shortcutsDataArray.push({
                    name: shortcutsArray[i],
                    icon: shortcutsArray[i + 1],
                    command: shortcutsArray[i + 2]
                });
            }
        }
        this._addRowsToFrame(shortcutsDataArray);

        let addMoreGroup = new Adw.PreferencesGroup();
        let addMoreButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER
        });
        addMoreButton.connect('clicked', () => {
            let dialog = new AddAppsToPinnedListWindow(this._settings, this, this.list_type, this.settingString);
            dialog.show();
            dialog.connect('response', (_w, response) => {
                if(response === Gtk.ResponseType.APPLY) {
                    this._addRowToFrame(dialog.shortcutData);
                    this.saveSettings();
                }
                if(response === Gtk.ResponseType.REJECT) {
                    let command = dialog.shortcutData.command;
                    let frameRow;
                    this.frameRows.forEach(child => {
                        if(command === child.shortcut_command)
                            frameRow = child;
                    });
                    if(frameRow){
                        this.frameRows.splice(this.frameRows.indexOf(frameRow), 1);
                        this.frame.remove(frameRow);
                        this.saveSettings();
                    }
                }
            });
        });
        let addMoreRow = new Adw.ActionRow({
            title: _(addMoreTitle),
            activatable_widget: addMoreButton
        });
        addMoreRow.add_suffix(addMoreButton);
        addMoreGroup.add(addMoreRow);

        this.add(addMoreGroup);
        if(this.list_type !== Constants.MenuSettingsListType.CONTEXT_MENU){
            let addCustomButton = new Gtk.Button({
                icon_name: 'list-add-symbolic',
                valign: Gtk.Align.CENTER
            });
            addCustomButton.connect('clicked', () => {
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, this.list_type);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        this._addRowToFrame(dialog.shortcutData);
                        dialog.destroy();
                        this.saveSettings();
                    }
                });
            });
            let addCustomRow = new Adw.ActionRow({
                title: _("Add Custom Shortcut"),
                activatable_widget: addCustomButton
            });
            addCustomRow.add_suffix(addCustomButton);
            addMoreGroup.add(addCustomRow);
        }
        

        this.restoreDefaults = () => {
            this.frameRows.forEach(child => {
                this.frame.remove(child);
            });

            this.frameRows = [];
            let shortcutsDataArray = [];

            const shortcutsArray = this._settings.get_default_value(this.settingString).deep_unpack();
            if(nestedArraySetting){
                for(let i = 0; i < shortcutsArray.length; i++){
                    shortcutsDataArray.push({
                        name: shortcutsArray[i][0],
                        icon: shortcutsArray[i][1],
                        command: shortcutsArray[i][2]
                    });
                }
            }
            else{
                for(let i = 0; i < shortcutsArray.length; i+=3){
                    shortcutsDataArray.push({
                        name: shortcutsArray[i],
                        icon: shortcutsArray[i + 1],
                        command: shortcutsArray[i + 2]
                    });
                }
            }

            this._addRowsToFrame(shortcutsDataArray);
            this.saveSettings();
        };
    }

    updatePinnedApps(){
        this.frameRows.forEach(child => {
            this.frame.remove(child);
        });
        this.frameRows = [];
        let shortcutsDataArray = [];

        const shortcutsArray = this._settings.get_value(this.settingString).deep_unpack();
        for(let i = 0; i < shortcutsArray.length; i+=3){
            shortcutsDataArray.push({
                name: shortcutsArray[i],
                icon: shortcutsArray[i + 1],
                command: shortcutsArray[i + 2]
            });
        }
        this._addRowsToFrame(shortcutsDataArray);
    }

    saveSettings(){
        let array = [];
        this.frameRows.sort((a, b) => {
            return a.get_index() - b.get_index();
        });
        this.frameRows.forEach(child => {
            if(this.list_type === Constants.MenuSettingsListType.PINNED_APPS){
                array.push(child.shortcut_name);
                array.push(child.shortcut_icon);
                array.push(child.shortcut_command);
            }
            else
                array.push([child.shortcut_name, child.shortcut_icon, child.shortcut_command]);
        });

        if(this.list_type === Constants.MenuSettingsListType.PINNED_APPS)
            this._settings.set_strv(this.settingString, array);
        else
            this._settings.set_value(this.settingString, new GLib.Variant('aas', array));
    }

    _setRowData(row, shortcutData){
        row.shortcut_name = shortcutData.name;
        row.shortcut_command = shortcutData.command;

        let appInfo = Gio.DesktopAppInfo.new(row.shortcut_command);
        let shortcutIcon = shortcutData.icon ?? '';

        if(shortcutIcon === Constants.ShortcutCommands.ARCMENU_ICON)
            shortcutIcon = Constants.ArcMenuLogoSymbolic;
        else if(row.shortcut_command === 'org.gnome.Settings.desktop' && !appInfo)
            appInfo = Gio.DesktopAppInfo.new('gnome-control-center.desktop');
        else if(row.shortcut_command === Constants.ShortcutCommands.SOFTWARE){
            for(let softwareManagerID of Constants.SoftwareManagerIDs){
                let app = Gio.DesktopAppInfo.new(softwareManagerID);
                if(app){
                    const appIcon = app.get_icon();
                    shortcutIcon = appIcon ? appIcon.to_string() : '';
                    break;
                }
            }
        }
        else if(this.list_type === Constants.MenuSettingsListType.DIRECTORIES || this.list_type === Constants.MenuSettingsListType.EXTRA_SHORTCUTS)
            shortcutIcon = SettingsUtils.getIconStringFromListing([shortcutData.name, shortcutData.icon, shortcutData.command]);

        if(appInfo && row.shortcut_name === ''){
            row.shortcut_name = appInfo.get_name();
        }

        if((!shortcutIcon || shortcutIcon.length < 1) && appInfo)
            shortcutIcon = appInfo.get_icon() ? appInfo.get_icon().to_string() : "";

        row.shortcut_icon = shortcutIcon;
        row.gicon = Gio.icon_new_for_string(shortcutIcon);
        row.title = GLib.markup_escape_text(row.shortcut_name, -1);

        if(row.shortcut_command.endsWith('.desktop') && !appInfo){
            row.gicon = Gio.icon_new_for_string('settings-warning-symbolic');
            row.title = '<b><i>' + _('Invalid Shortcut') + '</i></b> - ' + (row.title ? _(row.title) : row.shortcut_command);
            row.css_classes = ['error'];
        }
        else
            row.css_classes = [];
    }

    _addRowToFrame(shortcutData){
        const row = new PW.DragRow();

        const editEntryButton = new PW.EditEntriesBox({
            row: row,
            allow_modify: true,
            allow_remove: true
        });
        row.activatable_widget = editEntryButton;

        this._setRowData(row, shortcutData);

        row.connect('change-button-clicked', () => {
            let dialog = new AddAppsToPinnedListWindow(this._settings, this.list_type, this.settingString);
            dialog.show();
            dialog.connect('response', (_w, response) => {
                if(response === Gtk.ResponseType.APPLY) {
                    this._setRowData(row, dialog.shortcutData);
                    dialog.destroy();
                    this.saveSettings();
                }
            });
        });
        row.connect("drag-drop-done", () => this.saveSettings() );

        editEntryButton.connect('modify-button-clicked', () => {
            let currentShortcutData = {
                name: row.shortcut_name,
                icon: row.shortcut_icon,
                command: row.shortcut_command
            }
            let dialog = new AddCustomLinkDialogWindow(this._settings, this, this.list_type, currentShortcutData);
            dialog.show();
            dialog.connect('response', (_w, response) => {
                if(response === Gtk.ResponseType.APPLY) {
                    this._setRowData(row, dialog.shortcutData);
                    dialog.destroy();
                    this.saveSettings();
                }
            });
        });
        editEntryButton.connect('entry-modified', (_self, startIndex, newIndex) => {
            const splicedItem = this.frameRows.splice(startIndex, 1)[0];

            if(newIndex >= 0)
                this.frameRows.splice(newIndex, 0, splicedItem);
                
            this.saveSettings();
        });

        row.add_suffix(editEntryButton);
        this.frameRows.push(row);
        this.frame.add(row);
    }

    _addRowsToFrame(shortcutsArray) {
        shortcutsArray.forEach(shortcutData => {
            this._addRowToFrame(shortcutData);
        });
    }
});

var AddAppsToPinnedListWindow = GObject.registerClass(
class ArcMenu_AddAppsToPinnedListWindow extends PW.DialogWindow {
    _init(settings, parent, dialogType, settingString) {
        this._settings = settings;
        this._dialogType = dialogType;
        this.settingString = settingString;

        if(this._dialogType === Constants.MenuSettingsListType.PINNED_APPS)
            super._init(_('Add to your Pinned Apps'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.EXTRA_SHORTCUTS)
            super._init(_('Add to your Extra Shortcuts'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.APPLICATIONS)
            super._init(_('Select Application Shortcuts'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES)
            super._init(_('Select Directory Shortcuts'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.CONTEXT_MENU)
            super._init(_('Add to the Context Menu'), parent);

        this._createShortcutsArray();

        if(this._dialogType === Constants.MenuSettingsListType.PINNED_APPS){
            let extraItem = [[_("ArcMenu Settings"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.ARCMENU_SETTINGS]];
            this._loadExtraCategories(extraItem);
            this._loadCategories();
        }
        else if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES){
            let extraLinks = this._getDirectoryLinksArray();
            this._loadExtraCategories(extraLinks);
        }
        else if(this._dialogType === Constants.MenuSettingsListType.APPLICATIONS){
            let extraLinks = [];
            extraLinks.push([_("ArcMenu Settings"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.ARCMENU_SETTINGS]);
            extraLinks.push([_("Run Command..."), "system-run-symbolic", Constants.ShortcutCommands.RUN_COMMAND]);
            extraLinks.push([_("Activities Overview"), "view-fullscreen-symbolic", Constants.ShortcutCommands.OVERVIEW]);
            extraLinks.push([_("Show All Apps"), "view-app-grid-symbolic", Constants.ShortcutCommands.SHOW_APPS]);
            this._loadExtraCategories(extraLinks);
            this._loadCategories();
        }
        else if(this._dialogType === Constants.MenuSettingsListType.CONTEXT_MENU){
            let extraLinks = [];
            extraLinks.push([_("ArcMenu Settings"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.SETTINGS]);
            extraLinks.push([_("Menu Settings"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.SETTINGS_MENU]);
            extraLinks.push([_("Menu Theming"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.SETTINGS_THEME]);
            extraLinks.push([_("Change Menu Layout"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.SETTINGS_LAYOUT]);
            extraLinks.push([_("Menu Button Settings"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.SETTINGS_BUTTON]);
            extraLinks.push([_("About"), Constants.ArcMenuLogoSymbolic, Constants.ShortcutCommands.SETTINGS_ABOUT]);
            extraLinks.push([_("Panel Extension Settings"), "application-x-addon-symbolic", Constants.ShortcutCommands.PANEL_EXTENSION_SETTINGS]);
            extraLinks.push([_("Activities Overview"), "view-fullscreen-symbolic", Constants.ShortcutCommands.OVERVIEW]);
            extraLinks.push([_("Power Options"), "system-shutdown-symbolic", Constants.ShortcutCommands.POWER_OPTIONS]);
            extraLinks.push([_("Show Desktop"), "computer-symbolic", Constants.ShortcutCommands.SHOW_DESKTOP]);
            extraLinks.unshift([_("Separator"), "list-remove-symbolic", Constants.ShortcutCommands.SEPARATOR]);
            this._loadExtraCategories(extraLinks);
            this._loadCategories();
        }
        else{
            let extraLinks = this._getDirectoryLinksArray();
            extraLinks.unshift([_("Separator"), "list-remove-symbolic", Constants.ShortcutCommands.SEPARATOR]);
            extraLinks.push([_("Lock"), "changes-prevent-symbolic", Constants.ShortcutCommands.LOCK]);
            extraLinks.push([_("Log Out..."), "system-log-out-symbolic", Constants.ShortcutCommands.LOG_OUT]);
            extraLinks.push([_("Power Off..."), "system-shutdown-symbolic", Constants.ShortcutCommands.POWER_OFF]);
            extraLinks.push([_("Restart..."), 'system-reboot-symbolic', Constants.ShortcutCommands.RESTART]);
            extraLinks.push([_("Suspend"), "media-playback-pause-symbolic", Constants.ShortcutCommands.SUSPEND]);
            extraLinks.push([_("Hybrid Sleep"), 'weather-clear-night-symbolic', Constants.ShortcutCommands.HYBRID_SLEEP]);
            extraLinks.push([_("Hibernate"), "document-save-symbolic", Constants.ShortcutCommands.HIBERNATE]);
            extraLinks.push([_("Switch User"), "system-switch-user-symbolic", Constants.ShortcutCommands.SWITCH_USER]);
            this._loadExtraCategories(extraLinks);
            this._loadCategories();
        }
    }

    _getDirectoryLinksArray(){
        let directoryLinks = [];
        directoryLinks.push([_("Home"), Constants.ShortcutCommands.HOME, Constants.ShortcutCommands.HOME]);
        directoryLinks.push([_("Documents"), Constants.ShortcutCommands.DOCUMENTS, Constants.ShortcutCommands.DOCUMENTS]);
        directoryLinks.push([_("Downloads"), Constants.ShortcutCommands.DOWNLOADS, Constants.ShortcutCommands.DOWNLOADS]);
        directoryLinks.push([_("Music"), Constants.ShortcutCommands.MUSIC, Constants.ShortcutCommands.MUSIC]);
        directoryLinks.push([_("Pictures"), Constants.ShortcutCommands.PICTURES, Constants.ShortcutCommands.PICTURES]);
        directoryLinks.push([_("Videos"), Constants.ShortcutCommands.VIDEOS, Constants.ShortcutCommands.VIDEOS]);
        directoryLinks.push([_("Computer"), Constants.ShortcutCommands.COMPUTER, Constants.ShortcutCommands.COMPUTER]);
        directoryLinks.push([_("Network"), Constants.ShortcutCommands.NETWORK, Constants.ShortcutCommands.NETWORK]);
        directoryLinks.push([_("Recent"), "document-open-recent-symbolic", Constants.ShortcutCommands.RECENT]);
        return directoryLinks;
    }

    _createShortcutsArray(){
        let appsList = this._settings.get_value(this.settingString).deep_unpack();
        if(this._dialogType !== Constants.MenuSettingsListType.PINNED_APPS){
            this.shortcutsArray = [];
            for(let i = 0; i < appsList.length; i++){
                this.shortcutsArray.push(appsList[i][0]);
                this.shortcutsArray.push(appsList[i][1]);
                this.shortcutsArray.push(appsList[i][2]);
            }
        }
        else
            this.shortcutsArray = appsList;
    }

    findCommandMatch(command){
        for(let i = 2; i < this.shortcutsArray.length; i += 3){
            if(this.shortcutsArray[i] === command)
                return true;
        }
        return false;
    }

    _loadExtraCategories(extraCategories){
        for(let item of extraCategories){
            let subtitle = null;
            if (item[2] === Constants.ShortcutCommands.PANEL_EXTENSION_SETTINGS) {
                subtitle = _('Dash to Panel or App Icons Taskbar')
            }
            let frameRow = new Adw.ActionRow({
                title: _(item[0]),
                subtitle
            });

            let iconString;
            if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES || this._dialogType === Constants.MenuSettingsListType.EXTRA_SHORTCUTS)
                iconString = SettingsUtils.getIconStringFromListing([item[0], item[1], item[2]]);
            else
                iconString = item[1];

            frameRow.shortcut_name = _(item[0]);
            frameRow.shortcut_icon = item[1];
            frameRow.shortcut_command = item[2];

            let iconImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string(iconString),
                pixel_size: 22
            });
            frameRow.add_prefix(iconImage);
            let match = this.findCommandMatch(frameRow.shortcut_command);

            if(frameRow.shortcut_command === Constants.ShortcutCommands.SEPARATOR)
                match = false;

            this.addButtonAction(frameRow, match);
            this.pageGroup.add(frameRow);
        }
    }

    _loadCategories() {
        let allApps = Gio.app_info_get_all();
        allApps.sort((a, b) => {
            let _a = a.get_display_name().toLowerCase();
            let _b = b.get_display_name().toLowerCase();
            return GLib.strcmp0(_a, _b);
        });
        let showAllApps = this._dialogType === Constants.MenuSettingsListType.CONTEXT_MENU;
        for(let i = 0; i < allApps.length; i++) {
            if(allApps[i].should_show() || showAllApps) {
                let frameRow = new Adw.ActionRow({
                    title: GLib.markup_escape_text(allApps[i].get_display_name(), -1)
                });
                frameRow.shortcut_name = allApps[i].get_display_name();
                frameRow.shortcut_icon = '';
                frameRow.shortcut_command = allApps[i].get_id();

                let icon = allApps[i].get_icon() ? allApps[i].get_icon().to_string() : "dialog-information";

                let iconImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string(icon),
                    pixel_size: 22
                });
                frameRow.add_prefix(iconImage);

                let match = this.findCommandMatch(allApps[i].get_id());

                this.addButtonAction(frameRow, match);
                this.pageGroup.add(frameRow);
            }
        }
    }

    addButtonAction(frameRow, match){
        let checkButton = new Gtk.Button({
            icon_name: match ? 'list-remove-symbolic' : 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
        });
        checkButton.connect('clicked', (widget) => {
            this.shortcutData = {
                name: frameRow.shortcut_name,
                icon: frameRow.shortcut_icon,
                command: frameRow.shortcut_command
            };

            if(!match){
                this.currentToast?.dismiss();

                this.currentToast = new Adw.Toast({
                    title: _("%s has been added").format(frameRow.title),
                    timeout: 2
                });
                this.currentToast.connect("dismissed", () => this.currentToast = null);

                this.add_toast(this.currentToast);
                this.emit("response", Gtk.ResponseType.APPLY);
            }
            else{
                this.currentToast?.dismiss();

                this.currentToast = new Adw.Toast({
                    title: _("%s has been removed").format(frameRow.title),
                    timeout: 2
                });
                this.currentToast.connect("dismissed", () => this.currentToast = null);

                this.add_toast(this.currentToast);
                this.emit("response", Gtk.ResponseType.REJECT);
            }

            if(frameRow.shortcut_command === Constants.ShortcutCommands.SEPARATOR)
                return;

            match = !match;
            checkButton.icon_name = match ? 'list-remove-symbolic' : 'list-add-symbolic';
        });
        frameRow.add_suffix(checkButton);
        frameRow.activatable_widget = checkButton;
    }
});

var AddCustomLinkDialogWindow = GObject.registerClass(
class ArcMenu_AddCustomLinkDialogWindow extends PW.DialogWindow {
    _init(settings, parent, dialogType, shortcutData = null) {
        let title = _('Add a Custom Shortcut');

        const isPinnedApp = dialogType === Constants.MenuSettingsListType.PINNED_APPS;
        if (shortcutData !== null) {
            if(isPinnedApp)
                title = _('Edit Pinned App');
            else 
                title = _('Edit Shortcut');
        }

        super._init(_(title), parent);
        this.set_default_size(600, 325);
        this.search_enabled = false;
        this._settings = settings;
        this._dialogType = dialogType;
        this.shortcutData = shortcutData;

        let nameFrameRow = new Adw.ActionRow({
            title: _('Title')
        });

        let nameEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL
        });
        nameFrameRow.add_suffix(nameEntry);
        this.pageGroup.add(nameFrameRow);

        let iconFrameRow = new Adw.ActionRow({
            title: _('Icon')
        });
        let iconEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL
        });

        let fileFilter = new Gtk.FileFilter();
        fileFilter.add_pixbuf_formats();
        let fileChooserButton = new Gtk.Button({
            icon_name: 'search-symbolic',
            tooltip_text: _('Browse...'),
            valign: Gtk.Align.CENTER,
        });

        fileChooserButton.connect('clicked', (widget) => {
            let dialog = new Gtk.FileChooserDialog({
                title: _('Select an Icon'),
                transient_for: this.get_root(),
                modal: true,
                action: Gtk.FileChooserAction.OPEN,
            });
            dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
            dialog.add_button("_Open", Gtk.ResponseType.ACCEPT);

            dialog.set_filter(fileFilter);

            dialog.connect("response", (self, response) => {
                if(response === Gtk.ResponseType.ACCEPT){
                    let iconFilepath = dialog.get_file().get_path();
                    iconEntry.set_text(iconFilepath);
                    dialog.destroy();
                }
                else if(response === Gtk.ResponseType.CANCEL)
                    dialog.destroy();
            });
            dialog.show();
        });
        iconFrameRow.add_suffix(iconEntry);
        iconFrameRow.add_suffix(fileChooserButton);
        this.pageGroup.add(iconFrameRow);

        if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES)
            iconEntry.set_text(Constants.ShortcutCommands.FOLDER);

        let cmdFrameRow = new Adw.ActionRow({
            title: this._dialogType === Constants.MenuSettingsListType.DIRECTORIES ? _("Directory") : _('Command')
        });

        let cmdEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL
        });
        cmdFrameRow.add_suffix(cmdEntry);
        this.pageGroup.add(cmdFrameRow);

        let addButton = new Gtk.Button({
            label: this.shortcutData ? _("Apply") : _("Add"),
            halign: Gtk.Align.END,
            css_classes: ['suggested-action']
        });

        if(this.shortcutData !== null) {
            nameEntry.text = this.shortcutData.name;
            iconEntry.text = this.shortcutData.icon;
            cmdEntry.text = this.shortcutData.command;
        }

        addButton.connect('clicked', () => {
            this.shortcutData = {
                name: nameEntry.get_text(),
                icon: iconEntry.get_text(),
                command: cmdEntry.get_text()
            };
            this.emit('response', Gtk.ResponseType.APPLY);
        });

        this.pageGroup.set_header_suffix(addButton);
    }
});
