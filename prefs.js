/*
 * ArcMenu - A traditional application menu for GNOME 3
 *
 * ArcMenu Lead Developer and Maintainer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 *
 * ArcMenu Founder, Former Maintainer, and Former Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33 - (No Longer Active)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const ByteArray = imports.byteArray;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const LayoutTweaks = Me.imports.menulayouts.tweaks;
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

const SCHEMA_PATH = '/org/gnome/shell/extensions/arcmenu/';
const GSET = 'gnome-shell-extension-tool';

var MenuSettingsListPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsListPage extends Gtk.Box {
        _init(settings, listType) {
            super._init({
                margin_top: 10,
                margin_bottom: 10,
                margin_start: 5,
                margin_end: 5,
                spacing: 20,
                orientation: Gtk.Orientation.VERTICAL
            });
            this.listType = listType;
            this._settings = settings;

            let addMoreTitle;
            if(this.listType === Constants.MenuSettingsListType.PINNED_APPS){
                this.settingString = 'pinned-app-list';
                this.appsList = this._settings.get_strv('pinned-app-list');
                addMoreTitle = _("Add More Apps");
            }
            else if(this.listType === Constants.MenuSettingsListType.DIRECTORIES){
                this.settingString = 'directory-shortcuts-list';
                this.appsList = [];
                let appsList = this._settings.get_value('directory-shortcuts-list').deep_unpack();
                for(let i = 0; i < appsList.length; i++){
                    this.appsList.push(appsList[i][0]);
                    this.appsList.push(appsList[i][1]);
                    this.appsList.push(appsList[i][2]);
                }
                addMoreTitle = _("Add Default User Directories");
            }
            else if(this.listType === Constants.MenuSettingsListType.APPLICATIONS){
                this.settingString = 'application-shortcuts-list';
                this.appsList = [];
                let appsList = this._settings.get_value('application-shortcuts-list').deep_unpack();
                for(let i = 0; i < appsList.length; i++){
                    this.appsList.push(appsList[i][0]);
                    this.appsList.push(appsList[i][1]);
                    this.appsList.push(appsList[i][2]);
                }
                addMoreTitle = _("Add More Apps");
            }
            
            this.frameRows = [];
            this.frame = new Adw.PreferencesGroup();

            this._createFrame(this.appsList);
            this.append(this.frame);

            let addMoreGroup = new Adw.PreferencesGroup();
            let addMoreRow = new Adw.ActionRow({
                title: _(addMoreTitle)
            });
            let addMoreButton = new PW.Button({
                icon_name: 'list-add-symbolic',
            });
            addMoreButton.connect('clicked', ()=> {
                let dialog = new AddAppsToPinnedListWindow(this._settings, this, this.listType);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        let newPinnedApps = dialog.newPinnedAppsArray;
                        let array = [];
                        for(let i = 0; i < newPinnedApps.length; i++){
                            array.push(newPinnedApps[i]._name);
                            array.push(newPinnedApps[i]._icon);
                            array.push(newPinnedApps[i]._cmd);
                        }
                        this._createFrame(array);
                        dialog.destroy();
                        this.saveSettings();
                    }
                });
            });
            addMoreRow.add_suffix(addMoreButton);
            addMoreGroup.add(addMoreRow);
            this.append(addMoreGroup);

            let addCustomRow = new Adw.ActionRow({
                title: _("Add Custom Shortcut")
            });
            let addCustomButton = new PW.Button({
                icon_name: 'list-add-symbolic',
            });
            addCustomButton.connect('clicked', ()=> {
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, this.listType);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        let newPinnedApps = dialog.newPinnedAppsArray;
                        this._createFrame(newPinnedApps);
                        dialog.destroy();
                        this.saveSettings();
                    }
                });
            });
            addCustomRow.add_suffix(addCustomButton);
            addMoreGroup.add(addCustomRow);

            this.restoreDefaults = () => {
                this.frameRows.forEach(child => {
                    this.frame.remove(child);
                });

                this.frameRows = [];

                let appsList = this._settings.get_default_value(this.settingString).deep_unpack();
                if(this.listType !== Constants.MenuSettingsListType.PINNED_APPS){
                    this.appsList = [];
                    for(let i = 0; i < appsList.length; i++){
                        this.appsList.push(appsList[i][0]);
                        this.appsList.push(appsList[i][1]);
                        this.appsList.push(appsList[i][2]);
                    }
                }
                else
                    this.appsList = appsList;
  
                this._createFrame(this.appsList);
                this.saveSettings();
            };
        }

        saveSettings(){
            let array = [];
            this.frameRows.sort((a, b) => {
                return a.get_index() > b.get_index();
            })
            this.frameRows.forEach(child => {
                if(this.listType === Constants.MenuSettingsListType.PINNED_APPS){
                    array.push(child._name);
                    array.push(child._icon);
                    array.push(child._cmd);
                }
                else
                    array.push([child._name, child._icon, child._cmd]);
            });
            
            if(this.listType === Constants.MenuSettingsListType.PINNED_APPS)
                this._settings.set_strv(this.settingString, array);
            else
                this._settings.set_value(this.settingString, new GLib.Variant('aas', array));

        }

        _createFrame(array) {
            for(let i = 0; i < array.length; i += 3) {
                let frameRow = new PW.FrameBoxDragRow();
                let editable = true;
                if(array[i + 2].startsWith("ArcMenu_")){
                    editable = false;
                }

                let iconString;
                frameRow._name = array[i];
                frameRow._icon = array[i + 1];
                frameRow._cmd = array[i + 2];

                if(frameRow._icon === "ArcMenu_ArcMenuIcon"){
                    frameRow._icon = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
                }
                if(this.listType === Constants.MenuSettingsListType.DIRECTORIES){
                    frameRow._icon = getIconPath([array[i], array[i + 1], array[i + 2]]);
                }
                iconString = frameRow._icon;
                if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                    iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                }
                frameRow._gicon = Gio.icon_new_for_string(iconString);
                let arcMenuImage = new Gtk.Image( {
                    gicon: frameRow._gicon,
                    pixel_size: 22
                });
                let dragImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string("drag-symbolic"),
                    pixel_size: 12
                });
                frameRow.add_prefix(arcMenuImage);
                frameRow.add_prefix(dragImage);
                frameRow.title = _(frameRow._name);

                checkIfValidShortcut(frameRow, arcMenuImage);

                let buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow,
                    modifyButton: editable,
                    deleteButton: true
                });
                buttonBox.connect('modify', ()=> {
                    let pinnedShortcut = [frameRow._name, frameRow._icon, frameRow._cmd];
                    let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.MenuSettingsListType.PINNED_APPS, pinnedShortcut);
                    dialog.show();
                    dialog.connect('response', (_w, response) => {
                        if(response === Gtk.ResponseType.APPLY) {
                            let newPinnedApps = dialog.newPinnedAppsArray;
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameRow.title = _(frameRow._name);
                            if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd))
                                arcMenuImage.gicon = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon();
                            else
                                arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            this.saveSettings();
                        }
                    });
                });
                buttonBox.connect("row-changed", () =>{
                    this.saveSettings();
                });
                buttonBox.connect("row-deleted", () =>{
                    this.frameRows.splice(this.frameRows.indexOf(frameRow), 1);
                    this.saveSettings();
                });
                frameRow.connect("drag-drop-done", () => {
                    this.saveSettings();
                });
                frameRow.add_suffix(buttonBox);
                this.frameRows.push(frameRow);
                this.frame.add(frameRow);
            }
        }
});

var AddAppsToPinnedListWindow = GObject.registerClass(
    class Arc_Menu_AddAppsToPinnedListWindow extends PW.DialogWindow {
        _init(settings, parent, dialogType) {
            this._settings = settings;
            this._dialogType = dialogType;
            if(this._dialogType == Constants.MenuSettingsListType.PINNED_APPS)
                super._init(_('Add to your Pinned Apps'), parent);
            else if(this._dialogType == Constants.MenuSettingsListType.OTHER)
                super._init(_('Change Selected Pinned App'), parent);
            else if(this._dialogType == Constants.MenuSettingsListType.APPLICATIONS)
                super._init(_('Select Application Shortcuts'), parent);
            else if(this._dialogType == Constants.MenuSettingsListType.DIRECTORIES)
                super._init(_('Select Directory Shortcuts'), parent);
            this.newPinnedAppsArray = [];
            this.addResponse = false;
            this._createLayout();
        }

        _createLayout(vbox) {
            let addAppsButton;
            if(this._dialogType == Constants.MenuSettingsListType.PINNED_APPS || this._dialogType == Constants.MenuSettingsListType.APPLICATIONS
                || this._dialogType == Constants.MenuSettingsListType.DIRECTORIES){
                addAppsButton = new Gtk.Button({
                    label: _("Add"),
                    halign: Gtk.Align.END
                });
                let context = addAppsButton.get_style_context();
                context.add_class('suggested-action');
                addAppsButton.connect('clicked', ()=> {
                    this.emit("response", Gtk.ResponseType.APPLY);
                });
                this.headerGroup.add(addAppsButton);
            }

            if(this._dialogType == Constants.MenuSettingsListType.PINNED_APPS){
                this._loadCategories();
            }
            else if(this._dialogType == Constants.MenuSettingsListType.DIRECTORIES){
                let defaultApplicationShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer"]);
                defaultApplicationShortcuts.push([_("Network"), "ArcMenu_Network", "ArcMenu_Network"]);
                defaultApplicationShortcuts.push([_("Trash"), "user-trash-symbolic", "ArcMenu_Trash"]);
                defaultApplicationShortcuts.push([_("Recent"), "document-open-recent-symbolic", "ArcMenu_Recent"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new Adw.ActionRow();

                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(getIconPath(defaultApplicationShortcuts[i])),
                        pixel_size: 22
                    });
                    frameRow.add_prefix(iconImage);

                    frameRow.title = _(frameRow._name);
                    let checkButton = new Gtk.CheckButton({
                        margin_end: 20
                    });
                    checkButton.connect('toggled', ()=> {
                        if(checkButton.get_active())
                            this.newPinnedAppsArray.push(frameRow);
                        else {
                            let index = this.newPinnedAppsArray.indexOf(frameRow);
                            this.newPinnedAppsArray.splice(index,1);
                        }
                    });
                    frameRow.add_suffix(checkButton);
                    frameRow.activatable_widget = checkButton;
                    this.pageGroup.add(frameRow);
                }
            }
            else if(this._dialogType == Constants.MenuSettingsListType.APPLICATIONS){
                this._loadCategories();
                let defaultApplicationShortcutsPage = new Adw.PreferencesPage({
                    title: _("Default Apps")
                });
                let defaultApplicationShortcutsFrame = new Adw.PreferencesGroup();
                defaultApplicationShortcutsPage.add(defaultApplicationShortcutsFrame);
                let defaultApplicationShortcuts = this._settings.get_default_value('application-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("ArcMenu Settings"), Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg', Constants.ArcMenuSettingsCommand]);
                defaultApplicationShortcuts.push([_("Run Command..."), "system-run-symbolic", "ArcMenu_RunCommand"]);
                defaultApplicationShortcuts.push([_("Show All Applications"), "view-fullscreen-symbolic", "ArcMenu_ShowAllApplications"]);

                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new Adw.ActionRow();
                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(frameRow._icon),
                        pixel_size: 22
                    });
                    frameRow.add_prefix(iconImage);

                    frameRow.title = frameRow._name;

                    let checkButton = new Gtk.CheckButton({
                        margin_end: 20
                    });
                    checkButton.connect('toggled', ()=> {
                        if(checkButton.get_active()) {
                            this.newPinnedAppsArray.push(frameRow);
                        }
                        else {
                            let index= this.newPinnedAppsArray.indexOf(frameRow);
                            this.newPinnedAppsArray.splice(index,1);
                        }
                    });
                    frameRow.add_suffix(checkButton);
                    frameRow.activatable_widget = checkButton;

                    defaultApplicationShortcutsFrame.add(frameRow);

                }
                this.add(defaultApplicationShortcutsPage);
            }
            else{
                this._loadCategories();
                let defaultApplicationShortcutsPage = new Adw.PreferencesPage({
                    title: _("Presets")
                });
                let defaultApplicationShortcutsFrame = new Adw.PreferencesGroup();
                defaultApplicationShortcutsPage.add(defaultApplicationShortcutsFrame);
                let defaultApplicationShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer"]);
                defaultApplicationShortcuts.push([_("Network"), "ArcMenu_Network", "ArcMenu_Network"]);
                defaultApplicationShortcuts.push([_("Trash"), "user-trash-symbolic", "ArcMenu_Trash"]);
                defaultApplicationShortcuts.push([_("Lock"), "changes-prevent-symbolic", "ArcMenu_Lock"]);
                defaultApplicationShortcuts.push([_("Log Out"), "application-exit-symbolic", "ArcMenu_LogOut"]);
                defaultApplicationShortcuts.push([_("Power Off"), "system-shutdown-symbolic", "ArcMenu_PowerOff"]);
                defaultApplicationShortcuts.push([_("Restart"), 'system-reboot-symbolic', "ArcMenu_Restart"]);
                defaultApplicationShortcuts.push([_("Suspend"), "media-playback-pause-symbolic", "ArcMenu_Suspend"]);
                defaultApplicationShortcuts.push([_("Hybrid Sleep"), Me.path + Constants.SleepIcon.PATH, "ArcMenu_HybridSleep"]);
                defaultApplicationShortcuts.push([_("Hibernate"), "document-save-symbolic", "ArcMenu_Hibernate"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new Adw.ActionRow();

                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(getIconPath(defaultApplicationShortcuts[i])),
                        pixel_size: 22
                    });
                    frameRow.add_prefix(iconImage);

                    frameRow.title = frameRow._name;

                    let checkButton = new PW.Button({
                        icon_name: 'list-add-symbolic'
                    });
                    checkButton.margin_end = 20;
                    checkButton.connect('clicked', ()=> {
                        this.newPinnedAppsArray.push(frameRow._name, frameRow._icon, frameRow._cmd);
                        this.emit("response", Gtk.ResponseType.APPLY);
                    });
                    frameRow.add_suffix(checkButton);
                    frameRow.activatable_widget = checkButton;

                    defaultApplicationShortcutsFrame.add(frameRow);

                }
                this.add(defaultApplicationShortcutsPage);
            }
        }

        _loadCategories(searchResults, showArcMenuSettings) {
            let allApps = searchResults ? searchResults : Gio.app_info_get_all();
            allApps.sort((a, b) => {
              let _a = a.get_display_name();
              let _b = b.get_display_name();
              return GLib.strcmp0(_a, _b);
            });

            let iter = -1;
            if(searchResults)
                iter = 0;
            if(showArcMenuSettings)
                iter = -1;
            for(let i = iter; i < allApps.length; i++) {
                if(i == -1 ? true : allApps[i].should_show()) {
                    let frameRow = new Adw.ActionRow();
                    let icon;
                    if(i == -1){
                        frameRow._name = _("ArcMenu Settings");
                        icon = frameRow._icon = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
                        frameRow._cmd = Constants.ArcMenuSettingsCommand;
                    }
                    else{
                        frameRow._app = allApps[i];
                        frameRow._name = allApps[i].get_display_name();
                        frameRow._icon = '';
                        if(allApps[i].get_icon())
                            icon = allApps[i].get_icon().to_string();
                        else
                            icon = "dialog-information";

                        frameRow._cmd = allApps[i].get_id();
                    }
                    frameRow.title = frameRow._name;
                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(icon),
                        pixel_size: 22
                    });
                    frameRow.add_prefix(iconImage);

                    if(this._dialogType == Constants.MenuSettingsListType.PINNED_APPS || this._dialogType == Constants.MenuSettingsListType.APPLICATIONS||
                        this._dialogType == Constants.MenuSettingsListType.DIRECTORIES){
                        let checkButton = new Gtk.CheckButton({
                            margin_end: 20
                        });
                        checkButton.connect('toggled', ()=> {
                            if(checkButton.get_active())
                                this.newPinnedAppsArray.push(frameRow);
                            else {
                                let index= this.newPinnedAppsArray.indexOf(frameRow);
                                this.newPinnedAppsArray.splice(index,1);
                            }
                        });
                        frameRow.add_suffix(checkButton);
                        frameRow.activatable_widget = checkButton;
                    }
                    else{
                        let checkButton = new PW.Button({
                            icon_name: 'list-add-symbolic',
                            margin_end: 20
                        });
                        checkButton.connect('clicked', ()=> {
                            this.newPinnedAppsArray.push(frameRow._name, frameRow._icon, frameRow._cmd);
                            this.addResponse = true;
                            this.emit("response", Gtk.ResponseType.APPLY);
                        });
                        frameRow.add_suffix(checkButton);
                        frameRow.activatable_widget = checkButton;
                    }
                    this.pageGroup.add(frameRow);
                }
            }
        }
});

var AddCustomLinkDialogWindow = GObject.registerClass(
    class Arc_Menu_AddCustomLinkDialogWindow extends PW.DialogWindow {
        _init(settings, parent, dialogType, pinnedShortcut = null) {
            let title = _('Add a Custom Shortcut');
            let isPinnedApps = this._dialogType === Constants.MenuSettingsListType.PINNED_APPS || this._dialogType === Constants.MenuSettingsListType.OTHER;
            if (pinnedShortcut && isPinnedApps) 
                title = _('Edit Pinned App');
            else if (pinnedShortcut)
                title = _('Edit Shortcut');

            super._init(_(title), parent);

            this._settings = settings;
            this.newPinnedAppsArray = [];
            this.addResponse = false;
            this._dialogType = dialogType;
            this.pinnedShortcut = pinnedShortcut;

            let nameFrameRow = new Adw.ActionRow({
                title: _('Title')
            });

            let nameEntry = new Gtk.Entry({
                valign: Gtk.Align.CENTER,
                width_chars: 35
            });
            nameFrameRow.add_suffix(nameEntry);
            this.pageGroup.add(nameFrameRow);

            let iconFrameRow = new Adw.ActionRow({
                title: _('Icon')
            });
            let iconEntry = new Gtk.Entry({
                valign: Gtk.Align.CENTER,
                width_chars: 35
            });

            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.Button({
                label: _('Browse...'),
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
                iconEntry.set_text("ArcMenu_Folder");

            let cmdFrameRow = new Adw.ActionRow({
                title: _('Terminal Command')
            });
            if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES)
                cmdFrameRow.title = _("Shortcut Path");
    
            let cmdEntry = new Gtk.Entry({
                valign: Gtk.Align.CENTER,
                width_chars: 35
            });
            cmdFrameRow.add_suffix(cmdEntry);
            this.pageGroup.add(cmdFrameRow);

            let addButton = new Gtk.Button({
                label: this.pinnedShortcut ?_("Apply") :_("Add"),
                halign: Gtk.Align.END
            });
            let context = addButton.get_style_context();
            context.add_class('suggested-action');
            if(this.pinnedShortcut !== null) {
                nameEntry.text = this.pinnedShortcut[0];
                iconEntry.text = this.pinnedShortcut[1];
                cmdEntry.text = this.pinnedShortcut[2];
            }
            addButton.connect('clicked', ()=> {
                this.newPinnedAppsArray.push(nameEntry.get_text());
                this.newPinnedAppsArray.push(iconEntry.get_text());
                this.newPinnedAppsArray.push(cmdEntry.get_text());
                this.emit('response', Gtk.ResponseType.APPLY)
            });

            this.headerGroup.add(addButton);
        }
});

var GeneralPage = GObject.registerClass(
    class Arc_Menu_GeneralPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: _('General'),
                icon_name: 'homescreen-symbolic'
            });
            this._settings = settings;

            let menuPlacementGroup = new Adw.PreferencesGroup({
                title: _("Display Options")
            });

            this.add(menuPlacementGroup);
            this._createDisplayOnFrame(menuPlacementGroup);
        
            let modifyHotCornerGroup = new Adw.PreferencesGroup({
                title: _("Hot Corner Options")
            });
            this.add(modifyHotCornerGroup);

            let modifyHotCornerRow = new Adw.ActionRow({
                title: _("Modify Hot Corner"),
            });

            let modifyHotCornerButton = new PW.Button({
                icon_name: 'emblem-system-symbolic',
            });
            modifyHotCornerButton.connect('clicked', ()=> {
                let dialog = new ModifyHotCornerDialogWindow(this._settings, this);
                dialog.show();
                dialog.connect('response', ()=> {
                    dialog.destroy();
                });
            });
            modifyHotCornerRow.add_suffix(modifyHotCornerButton);

            let modifyHotCornerSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
            });
            modifyHotCornerSwitch.set_active(this._settings.get_boolean('override-hot-corners'));
            modifyHotCornerButton.set_sensitive(this._settings.get_boolean('override-hot-corners'));
            modifyHotCornerSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('override-hot-corners',widget.get_active());
                modifyHotCornerButton.set_sensitive(widget.get_active());
                if(!widget.get_active()){
                    this._settings.set_enum('hot-corners',Constants.HotCornerAction.DEFAULT);
                }
            });
            modifyHotCornerRow.add_suffix(modifyHotCornerSwitch);
            modifyHotCornerGroup.add(modifyHotCornerRow);
            this.add(modifyHotCornerGroup);

            let menuHotkeyGroup = this._createHotkeyGroup(_("Hotkey Options"), true);
            this.add(menuHotkeyGroup);

            let runnerHotkeyGroup = this._createHotkeyGroup(_("Standalone Runner Menu"), false);
            this.add(runnerHotkeyGroup);
        }

        _createHotkeyGroup(title, isMenuHotkey){
            let hotkeyGroup = new Adw.PreferencesGroup({
                title: _(title)
            });
            let enableRunnerMenuSwitch, hotkeyEnumSetting, customHotkeySetting, primaryMonitorSetting;
            if(isMenuHotkey){
                hotkeyEnumSetting = 'menu-hotkey';
                customHotkeySetting = 'toggle-arcmenu';
                primaryMonitorSetting = 'hotkey-open-primary-monitor';
            }
            else{
                hotkeyEnumSetting = 'runner-menu-hotkey';
                customHotkeySetting = 'toggle-runner-menu';
                primaryMonitorSetting = 'runner-hotkey-open-primary-monitor';
                let enableRunnerMenuRow = new Adw.ActionRow({
                    title: _("Enable a standalone Runner menu")
                });
                enableRunnerMenuSwitch = new Gtk.Switch({
                    halign: Gtk.Align.END,
                    valign: Gtk.Align.CENTER,
                });
                enableRunnerMenuSwitch.set_active(this._settings.get_boolean('enable-standlone-runner-menu'));
                enableRunnerMenuSwitch.connect('notify::active', (widget) => {
                    this._settings.set_boolean('enable-standlone-runner-menu', widget.get_active());
                    if(!widget.get_active()){
                        customHotkeyRow.visible = false;
                        hotkeyRow.visible = false;
                        primaryMonitorRow.visible = false;
                        hotkeyActivationRow.visible = false;
                    }
                    else{
                        hotkeyRow.visible = true;
                        primaryMonitorRow.visible = true;
                        
                        if(this._settings.get_enum(hotkeyEnumSetting) === 0){
                            customHotkeyRow.visible = false;
                            hotkeyActivationRow.visible = false;
                        }
                        else{
                            customHotkeyRow.visible = true;
                            hotkeyActivationRow.visible = true;
                        }
                    }
                });
                enableRunnerMenuRow.add_suffix(enableRunnerMenuSwitch);
                hotkeyGroup.add(enableRunnerMenuRow);
            }

            let hotkeyActivationRow = new Adw.ActionRow({
                title: _("Hotkey Activation"),
            });
            let hotkeyActivationCombo = new Gtk.ComboBoxText({
                valign: Gtk.Align.CENTER,
            });
            hotkeyActivationCombo.append_text(_("Key Release"));
            hotkeyActivationCombo.append_text(_("Key Press"));
            if(this._settings.get_boolean('disable-hotkey-onkeyrelease'))
                hotkeyActivationCombo.set_active(1);
            else
                hotkeyActivationCombo.set_active(0);
            hotkeyActivationCombo.connect('changed', (widget) => {
                if(widget.get_active() === 0)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',false);
                if(widget.get_active() === 1)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',true);
            });

            hotkeyActivationRow.add_suffix(hotkeyActivationCombo);

            let primaryMonitorRow = new Adw.ActionRow({
                title: _("Open on Primary Monitor"),
            });
            let primaryMonitorSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
            });
            primaryMonitorSwitch.set_active(this._settings.get_boolean(primaryMonitorSetting));
            primaryMonitorSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean(primaryMonitorSetting, widget.get_active());
            });
            primaryMonitorRow.add_suffix(primaryMonitorSwitch);

            let hotkeyRow = new Adw.ActionRow({
                title: isMenuHotkey ? _("Menu Hotkey") : _("Runner Hotkey"),
            });

            let hotkeyCombo = new Gtk.ComboBoxText({
                valign: Gtk.Align.CENTER,
            });
            if(isMenuHotkey)
                hotkeyCombo.append("NONE", _("None"));
            hotkeyCombo.append("SUPER_L", _("Left Super Key"));
            hotkeyCombo.append("CUSTOM", _("Custom Hotkey"));
            hotkeyRow.add_suffix(hotkeyCombo);

            let customHotkeyRow = new Adw.ActionRow({
                title: _("Current Hotkey"),
            });

            let shortcutCell = new Gtk.ShortcutsShortcut({
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER,
                hexpand: true,
            });
            shortcutCell.accelerator = this._settings.get_strv(customHotkeySetting).toString();

            let modifyHotkeyButton = new Gtk.Button({
                label: _("Modify Hotkey"),
                valign: Gtk.Align.CENTER,
            });
            customHotkeyRow.add_suffix(shortcutCell);
            customHotkeyRow.add_suffix(modifyHotkeyButton);
            modifyHotkeyButton.connect('clicked', () => {
                let dialog = new CustomHotkeyDialogWindow(this._settings, this);
                dialog.show();
                dialog.connect('response', () => {
                    let customHotKeyEnum = isMenuHotkey ? 2 : 1;
                    if(dialog.addResponse) {
                        this._settings.set_enum(hotkeyEnumSetting, 0);
                        this._settings.set_strv(customHotkeySetting, [dialog.resultsText]);
                        this._settings.set_enum(hotkeyEnumSetting, customHotKeyEnum);
                        shortcutCell.accelerator = dialog.resultsText;
                        dialog.destroy();
                    }
                    else {
                        shortcutCell.accelerator = this._settings.get_strv(customHotkeySetting).toString();
                        this._settings.set_enum(hotkeyEnumSetting, customHotKeyEnum);
                        dialog.destroy();
                    }
                });
            });

            hotkeyGroup.add(hotkeyRow);
            hotkeyGroup.add(customHotkeyRow);
            hotkeyGroup.add(hotkeyActivationRow);
            hotkeyGroup.add(primaryMonitorRow);

            hotkeyCombo.connect('changed', (widget) => {
                if(widget.get_active_id() === "NONE"){
                    customHotkeyRow.visible = false;
                    hotkeyActivationRow.visible = false;
                    primaryMonitorRow.visible = false;
                    if(!isMenuHotkey)
                        hotkeyRow.visible = false;
                }
                else if(widget.get_active_id() === "SUPER_L"){
                    customHotkeyRow.visible = false;
                    hotkeyActivationRow.visible = false;
                    primaryMonitorRow.visible = true;
                    if(!isMenuHotkey)
                        hotkeyRow.visible = true;
                }
                else if(widget.get_active_id() === "CUSTOM"){
                    customHotkeyRow.visible = true;
                    hotkeyActivationRow.visible = true;
                    primaryMonitorRow.visible = true;
                    if(!isMenuHotkey)
                        hotkeyRow.visible = true;
                }
                this._settings.set_enum(hotkeyEnumSetting, widget.get_active());
            });
            hotkeyCombo.set_active(this._settings.get_enum(hotkeyEnumSetting));

            if(!isMenuHotkey && !enableRunnerMenuSwitch.get_active()){
                customHotkeyRow.visible = false;
                hotkeyActivationRow.visible = false;
                primaryMonitorRow.visible = false;
                hotkeyRow.visible = false;
            }
            return hotkeyGroup;
        }

        _createDisplayOnFrame(menuPlacementGroup){
            const avaliablePlacement = this._settings.get_value('available-placement').deep_unpack();

            //Display ArcMenu on Row ------------------------------------------------------------------------------
            let menuPlacementRow = new Adw.ActionRow({
                title: _("Display ArcMenu On"),
            });
            let menuPlacementCombo = new Gtk.ComboBoxText({
                valign: Gtk.Align.CENTER
            });

            let dashExtensionName = _("Dash to Dock");
            let gnomeSettings = Gio.Settings.new("org.gnome.shell");
            let enabledExtensions = gnomeSettings.get_strv('enabled-extensions');
            if (enabledExtensions.includes('ubuntu-dock@ubuntu.com'))
                dashExtensionName = _("Ubuntu Dock");
    
            menuPlacementCombo.append_text(_("Main Panel"));
            menuPlacementCombo.append_text(_("Dash to Panel"));
            menuPlacementCombo.append_text(_(dashExtensionName));

            menuPlacementRow.add_suffix(menuPlacementCombo);
            //-----------------------------------------------------------------------------------------------------

            //Show Activities Row----------------------------------------------------------------------------
            let showActivitiesRow = new Adw.ActionRow({
                title: _("Show Activities Button")
            });
            let showActivitiesSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER
            });
            showActivitiesSwitch.set_active(this._settings.get_boolean('show-activities-button'));
            showActivitiesSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('show-activities-button', widget.get_active());
            });
            showActivitiesRow.add_suffix(showActivitiesSwitch);
            //-----------------------------------------------------------------------------------------------

            //Warning Row------------------------------------------------------------------------------------
            let warningImage = new Gtk.Image({
                icon_name: 'warning-symbolic',
                pixel_size: 24
            });
            let warningImageBox = new Gtk.Box({
                margin_top: 0,
                margin_bottom: 0,
                margin_start: 10
            });
            warningImageBox.append(warningImage);

            let warningRow = new Adw.ActionRow();
            warningRow.add_prefix(warningImageBox);
            //-------------------------------------------------------------------------------------

            //Position in Panel Row-------------------------------------------------------------
            let menuPositionRow = new Adw.ActionRow({
                title: _("Position in Panel"),
            });

            let menuPositionCombo = new Gtk.ComboBoxText({
                valign: Gtk.Align.CENTER
            });
            menuPositionCombo.append_text(_('Left'));
            menuPositionCombo.append_text(_('Center'));
            menuPositionCombo.append_text(_('Right'));
            menuPositionCombo.set_active(this._settings.get_enum('position-in-panel'));
            menuPositionCombo.connect('changed', (widget) => {
                if(widget.get_active() === Constants.MenuPosition.CENTER)
                    menuAlignmentRow.visible = true;
                else
                    menuAlignmentRow.visible = false;
                this._settings.set_enum('position-in-panel', widget.get_active());
            });

            menuPositionRow.add_suffix(menuPositionCombo);
            //--------------------------------------------------------------------------------------

            //Menu Alignment row--------------------------------------------------------------------
            let menuAlignmentRow = new Adw.ActionRow({
                title: _("Menu Alignment")
            });
            let menuAlignmentScale = new Gtk.Scale({
                valign: Gtk.Align.CENTER,
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
            });
            menuAlignmentRow.add_suffix(menuAlignmentScale);

            menuAlignmentScale.add_mark(0, Gtk.PositionType.BOTTOM, _("Left"));
            menuAlignmentScale.add_mark(50, Gtk.PositionType.BOTTOM, _("Center"));
            menuAlignmentScale.add_mark(100, Gtk.PositionType.BOTTOM, _("Right"));

            menuAlignmentScale.set_value(this._settings.get_int('menu-position-alignment'));
            menuAlignmentScale.connect('value-changed', (widget) => {
                this._settings.set_int('menu-position-alignment', widget.get_value());
            });
            //-------------------------------------------------------------------------------------

            //Mulit Monitor Row -------------------------------------------------------------------
            let multiMonitorRow = new Adw.ActionRow({
                title: _("Display ArcMenu on all monitors")
            });

            let multiMonitorSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
            });
            multiMonitorRow.add_suffix(multiMonitorSwitch);

            multiMonitorSwitch.set_active(this._settings.get_boolean('multi-monitor'));
            multiMonitorSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('multi-monitor', widget.get_active());
            });
            //--------------------------------------------------------------------------------------

            //Add the rows to the group
            menuPlacementGroup.add(menuPlacementRow);
            menuPlacementGroup.add(warningRow);
            menuPlacementGroup.add(menuPositionRow);
            menuPlacementGroup.add(menuAlignmentRow);
            menuPlacementGroup.add(multiMonitorRow);
            menuPlacementGroup.add(showActivitiesRow);

            //Set visibility of rows
            this.setVisibleDisplayOptions(menuPositionRow, menuAlignmentRow, multiMonitorRow, showActivitiesRow, warningRow);

            menuPlacementCombo.connect('changed', (widget) => {
                this._settings.set_enum('arc-menu-placement', widget.get_active());
                this.setVisibleDisplayOptions(menuPositionRow, menuAlignmentRow, multiMonitorRow, showActivitiesRow, warningRow);
            });

            const arcMenuPlacement = this._settings.get_enum('arc-menu-placement');

            //If 'Display Arcmenu On' is set to Dash to Panel, 
            //but DtP is not found, switch to Main Panel. And vice-versa
            if(arcMenuPlacement === Constants.ArcMenuPlacement.PANEL && !avaliablePlacement[Constants.ArcMenuPlacement.PANEL])
                menuPlacementCombo.set_active(Constants.ArcMenuPlacement.DTP);
            else if(arcMenuPlacement === Constants.ArcMenuPlacement.DTP && !avaliablePlacement[Constants.ArcMenuPlacement.DTP])
                menuPlacementCombo.set_active(Constants.ArcMenuPlacement.PANEL);
            else
                menuPlacementCombo.set_active(arcMenuPlacement);

            this._settings.connect('changed::available-placement', () => {
                this.setVisibleDisplayOptions(menuPositionRow, menuAlignmentRow, multiMonitorRow, showActivitiesRow, warningRow);
            });
        }

        setVisibleDisplayOptions(menuPositionRow, menuAlignmentRow, multiMonitorRow, showActivitiesRow, warningRow){
            const avaliablePlacement = this._settings.get_value('available-placement').deep_unpack();
            const arcMenuPlacement = this._settings.get_enum('arc-menu-placement');
            const isInPanel = arcMenuPlacement === Constants.ArcMenuPlacement.PANEL || arcMenuPlacement === Constants.ArcMenuPlacement.DTP;
            const positionInPanel = this._settings.get_enum('position-in-panel');

            //Handle the menuPositionRow visibility
            menuPositionRow.visible = isInPanel ? true : false;
   
            //Handle the menuAlignmentRow visibility
            menuAlignmentRow.visible = isInPanel && positionInPanel === Constants.MenuPosition.CENTER;

            //If set to display on Dash to Panel
            if(arcMenuPlacement === Constants.ArcMenuPlacement.DTP){
                if(avaliablePlacement[Constants.ArcMenuPlacement.DTP]){
                    warningRow.visible = false;
                    showActivitiesRow.visible = true;
                    multiMonitorRow.visible = true;
                }
                else{
                    warningRow.title = _("Dash to Panel extension not running!") + "\n" + _("Enable Dash to Panel for this feature to work.");
                    menuPositionRow.visible = false;
                    menuAlignmentRow.visible = false;
                    multiMonitorRow.visible = false;
                    showActivitiesRow.visible = false;
                    warningRow.visible = true;
                }
            }

            //If set to display on Dash to Dock
            if(arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
                if(avaliablePlacement[Constants.ArcMenuPlacement.DASH]){
                    warningRow.visible = false;
                    multiMonitorRow.visible = true;
                    showActivitiesRow.visible = true;
                }
                else{
                    warningRow.title = _("Dash to Dock extension not running!") + "\n" + _("Enable Dash to Dock for this feature to work.");
                    menuPositionRow.visible = false;
                    menuAlignmentRow.visible = false;
                    multiMonitorRow.visible = false;
                    showActivitiesRow.visible = false;
                    warningRow.visible = true;
                }
            }

            //If set to display on Main Panel
            if(arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
                multiMonitorRow.visible = false;
                if(avaliablePlacement[Constants.ArcMenuPlacement.PANEL]){
                    showActivitiesRow.visible = true;
                    warningRow.visible = false;
                }
                else{
                    warningRow.title = _("Main Panel not found!");
                    menuPositionRow.visible = false;
                    menuAlignmentRow.visible = false;
                    multiMonitorRow.visible = false;
                    showActivitiesRow.visible = false;
                    warningRow.visible = true;
                }
            }
        }
});

var ModifyHotCornerDialogWindow = GObject.registerClass(
    class Arc_Menu_ModifyHotCornerDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            super._init(_('Modify Hot Corner'), parent);
            this.set_default_size(600,250);
        }

        _createLayout(vbox) {
            let modifyHotCornerFrame = new PW.FrameBox();
            let modifyHotCornerRow = new PW.FrameBoxRow();
            let modifyHotCornerLabel = new Gtk.Label({
                label: _("Hot Corner Action"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hotCornerActionCombo = new Gtk.ComboBoxText({
                halign: Gtk.Align.END,
            });
            hotCornerActionCombo.append_text(_("GNOME Default"));
            hotCornerActionCombo.append_text(_("Disabled"));
            hotCornerActionCombo.append_text(_("Open ArcMenu"));
            hotCornerActionCombo.append_text(_("Custom"));

            let customHotCornerFrame = new PW.FrameBox();
            let customHeaderHotCornerRow = new PW.FrameBoxRow();

            let customHeaderHotCornerLabel = new Gtk.Label({
                label: "<b>"+_("Custom Hot Corner Action") + "</b>\n" + _("Choose from a list of preset commands or use your own terminal command"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            customHeaderHotCornerRow.add(customHeaderHotCornerLabel);

            let presetCustomHotCornerRow = new PW.FrameBoxRow();
            let presetCustomHotCornerLabel = new Gtk.Label({
                label: _("Preset commands"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hotCornerPresetsCombo = new Gtk.ComboBoxText({
                hexpand: true
            });

            hotCornerPresetsCombo.append_text(_("Show all Applications"));
            hotCornerPresetsCombo.append_text(_("GNOME Terminal"));
            hotCornerPresetsCombo.append_text(_("GNOME System Monitor"));
            hotCornerPresetsCombo.append_text(_("GNOME Calculator"));
            hotCornerPresetsCombo.append_text(_("GNOME gedit"));
            hotCornerPresetsCombo.append_text(_("GNOME Screenshot"));
            hotCornerPresetsCombo.append_text(_("GNOME Weather"));
            hotCornerPresetsCombo.append_text(_("Run Command..."));
            hotCornerPresetsCombo.connect('changed', (widget) => {
                if(widget.get_active() === 0)
                    customHotCornerEntry.set_text("ArcMenu_ShowAllApplications");
                else if(widget.get_active() === 1)
                    customHotCornerEntry.set_text("gnome-terminal");
                else if(widget.get_active() === 2)
                    customHotCornerEntry.set_text("gnome-system-monitor");
                else if(widget.get_active() === 3)
                    customHotCornerEntry.set_text("gnome-calculator");
                else if(widget.get_active() === 4)
                    customHotCornerEntry.set_text("gedit");
                else if(widget.get_active() === 5)
                    customHotCornerEntry.set_text("gnome-screenshot");
                else if(widget.get_active() === 6)
                    customHotCornerEntry.set_text("gnome-weather");
                else if(widget.get_active() === 7)
                    customHotCornerEntry.set_text("ArcMenu_RunCommand");
            });
            presetCustomHotCornerRow.add(presetCustomHotCornerLabel);
            presetCustomHotCornerRow.add(hotCornerPresetsCombo);

            let customHotCornerRow = new PW.FrameBoxRow();
            let customHotCornerLabel = new Gtk.Label({
                label: _("Terminal Command"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let customHotCornerEntry = new Gtk.Entry({
            });
            customHotCornerEntry.set_text(this._settings.get_string('custom-hot-corner-cmd'));
            customHotCornerEntry.connect('changed', (widget) => {
                applyButton.set_sensitive(true);
                let index = this.checkIfMatch(customHotCornerEntry.get_text());
                hotCornerPresetsCombo.set_active(index)
            });
            customHotCornerEntry.set_width_chars(40);

            let index = this.checkIfMatch(customHotCornerEntry.get_text());
            hotCornerPresetsCombo.set_active(index)
            customHotCornerRow.add(customHotCornerLabel);
            customHotCornerRow.add(customHotCornerEntry);

            customHotCornerFrame.add(customHeaderHotCornerRow);
            customHotCornerFrame.add(presetCustomHotCornerRow);
            customHotCornerFrame.add(customHotCornerRow);

            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true,
            });
            applyButton.connect('clicked', () => {
                this._settings.set_string('custom-hot-corner-cmd',customHotCornerEntry.get_text());
                this._settings.set_enum('hot-corners',hotCornerActionCombo.get_active());
                applyButton.set_sensitive(false);
                this.addResponse = true;
                this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);


            let hotCornerAction = this._settings.get_enum('hot-corners');
            hotCornerActionCombo.set_active(hotCornerAction);
            hotCornerActionCombo.connect('changed', (widget) => {
                applyButton.set_sensitive(true);
                if(widget.get_active()==Constants.HotCornerAction.CUSTOM){
                    customHotCornerFrame.set_sensitive(true);
                }
                else{
                    customHotCornerFrame.set_sensitive(false);
                }
            });

            modifyHotCornerRow.add(modifyHotCornerLabel);
            modifyHotCornerRow.add(hotCornerActionCombo);
            modifyHotCornerFrame.add(modifyHotCornerRow);
            if(hotCornerActionCombo.get_active() == Constants.HotCornerAction.CUSTOM)
                customHotCornerFrame.set_sensitive(true);
            else
                customHotCornerFrame.set_sensitive(false);
            vbox.append(modifyHotCornerFrame);
            vbox.append(customHotCornerFrame);
            vbox.append(applyButton);
        }
        checkIfMatch(text){
            if(text === "ArcMenu_ShowAllApplications")
                return 0;
            else if(text === "gnome-terminal")
                return 1;
            else if(text === "gnome-system-monitor")
                return 2;
            else if(text === "gnome-calculator")
                return 3;
            else if(text === "gedit")
                return 4;
            else if(text === "gnome-screenshot")
                return 5;
            else if(text === "gnome-weather")
                return 6;
            else if(text === "ArcMenu_RunCommand")
                return 7;
            else
                return -1;
        }
});

var CustomHotkeyDialogWindow = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},
    class Arc_Menu_CustomHotkeyDialogWindow extends Gtk.Window {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.keyEventController = new Gtk.EventControllerKey();

            super._init({
                modal: true,
                title: _("Set Custom Hotkey"),
                transient_for: parent.get_root()
            });
            let vbox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                homogeneous: false,
                margin_top: 5,
                margin_bottom: 5,
                margin_start: 5,
                margin_end: 5,
                hexpand: true,
                halign: Gtk.Align.FILL
            });
            this.set_child(vbox);
            this._createLayout(vbox);
            this.add_controller(this.keyEventController);
            this.set_size_request(500, 250);
        }

        _createLayout(vbox) {
            let hotkeyKey = '';

            let modLabel = new Gtk.Label({
                label:_("Choose Modifiers"),
                use_markup: true,
                hexpand: true,
                halign: Gtk.Align.START
            });
            let modFrame = new PW.FrameBox();
            let modRow = new PW.FrameBoxRow();
            modRow.add(modLabel);

            let buttonBox = new Gtk.Box({
                hexpand: true,
                halign: Gtk.Align.END,
                spacing: 5
            });
            modRow.add(buttonBox);
            let ctrlButton = new Gtk.ToggleButton({
                label: _("Ctrl")
            });
            let superButton = new Gtk.ToggleButton({
                label: _("Super")
            });
            let shiftButton = new Gtk.ToggleButton({
                label: _("Shift")
            });
            let altButton = new Gtk.ToggleButton({
                label: _("Alt")
            });
            ctrlButton.connect('toggled', () => {
                this.resultsText="";
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
                if(superButton.get_active()) this.resultsText += "<Super>";
                if(shiftButton.get_active()) this.resultsText += "<Shift>";
                if(altButton.get_active()) this.resultsText += "<Alt>";
                this.resultsText += hotkeyKey;
                resultsWidget.accelerator =  this.resultsText;
                applyButton.set_sensitive(true);
            });
            superButton.connect('toggled', () => {
                this.resultsText="";
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
                if(superButton.get_active()) this.resultsText += "<Super>";
                if(shiftButton.get_active()) this.resultsText += "<Shift>";
                if(altButton.get_active()) this.resultsText += "<Alt>";
                this.resultsText += hotkeyKey;
                resultsWidget.accelerator =  this.resultsText;
                applyButton.set_sensitive(true);
            });
            shiftButton.connect('toggled', () => {
                this.resultsText="";
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
                if(superButton.get_active()) this.resultsText += "<Super>";
                if(shiftButton.get_active()) this.resultsText += "<Shift>";
                if(altButton.get_active()) this.resultsText += "<Alt>";
                this.resultsText += hotkeyKey;
                resultsWidget.accelerator =  this.resultsText;
                applyButton.set_sensitive(true);
            });
            altButton.connect('toggled', () => {
                this.resultsText="";
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
                if(superButton.get_active()) this.resultsText += "<Super>";
                if(shiftButton.get_active()) this.resultsText += "<Shift>";
                if(altButton.get_active()) this.resultsText += "<Alt>";
                this.resultsText += hotkeyKey;
                resultsWidget.accelerator =  this.resultsText;
                applyButton.set_sensitive(true);
            });
            buttonBox.append(ctrlButton);
            buttonBox.append(superButton);
            buttonBox.append(shiftButton);
            buttonBox.append(altButton);
            modFrame.add(modRow);
            vbox.append(modFrame);

            let keyFrame = new PW.FrameBox();
            let keyLabel = new Gtk.Label({
                label: _("Press any key"),
                use_markup: true,
                xalign: .5,
                hexpand: true,
                halign: Gtk.Align.CENTER
            });
            vbox.append(keyLabel);
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/icons/prefs_icons/keyboard-symbolic.svg', 256, 72);
            let keyboardImage = Gtk.Picture.new_for_pixbuf(pixbuf);
            keyboardImage.hexpand = true;
            keyboardImage.vexpand = true;
            keyboardImage.halign = Gtk.Align.CENTER;
            keyboardImage.valign = Gtk.Align.CENTER;
            vbox.append(keyboardImage)

            let resultsRow = new PW.FrameBoxRow();
            let resultsLabel = new Gtk.Label({
                label: _("New Hotkey"),
                use_markup: true,
                xalign: .5,
                hexpand: false,
                halign: Gtk.Align.START
            });
            let resultsWidget = new Gtk.ShortcutsShortcut({
                hexpand: true,
                halign: Gtk.Align.END
            });
            resultsRow.add(resultsLabel);
            resultsRow.add(resultsWidget);
            keyFrame.add(resultsRow);

            let applyButton = new Gtk.Button({
                label: _("Apply"),
                halign: Gtk.Align.END
            });
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.emit("response", -10);
            });
            applyButton.set_sensitive(false);

            this.keyEventController.connect('key-released', (controller, keyval, keycode, state) =>  {
                this.resultsText = "";
                let key = keyval;
                hotkeyKey = Gtk.accelerator_name(key, 0);
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
                if(superButton.get_active()) this.resultsText += "<Super>";
                if(shiftButton.get_active()) this.resultsText += "<Shift>";
                if(altButton.get_active()) this.resultsText += "<Alt>";
                this.resultsText += Gtk.accelerator_name(key,0);
                resultsWidget.accelerator =  this.resultsText;
                applyButton.set_sensitive(true);
            });

            vbox.append(keyFrame);
            vbox.append(applyButton);
        }
});

function getIconPixbuf(filePath){
    if (GLib.file_test(filePath, GLib.FileTest.EXISTS))
        return GdkPixbuf.Pixbuf.new_from_file_at_size(filePath, 25, 25);
    else
        return null;
}

var ButtonAppearancePage = GObject.registerClass(
    class Arc_Menu_ButtonAppearancePage extends Gtk.Box {
        _init(settings) {
            super._init({
                margin_top: 10,
                margin_bottom: 10,
                margin_start: 5,
                margin_end: 5,
                spacing: 20,
                orientation: Gtk.Orientation.VERTICAL
            });
            this._settings = settings;
            this.menuButtonColor = this._settings.get_string('menu-button-color');
            this.menuButtonHoverColor = this._settings.get_string('menu-button-hover-color');
            this.menuButtonActiveColor = this._settings.get_string('menu-button-active-color');
            this.menuButtonHoverBackgroundcolor = this._settings.get_string('menu-button-hover-backgroundcolor');
            this.menuButtonActiveBackgroundcolor = this._settings.get_string('menu-button-active-backgroundcolor');
            this.arcMenuPlacement = this._settings.get_enum('arc-menu-placement');

            let menuButtonAppearanceFrame = new Adw.PreferencesGroup({
                title: _('Menu Button Appearance')
            });
            let menuButtonAppearanceRow = new Adw.ActionRow({
                title: _('Appearance')
            });

            let menuButtonAppearanceCombo = new Gtk.ComboBoxText({ 
                valign: Gtk.Align.CENTER 
            });
            menuButtonAppearanceCombo.append_text(_("Icon"));
            menuButtonAppearanceCombo.append_text(_("Text"));
            menuButtonAppearanceCombo.append_text(_("Icon and Text"));
            menuButtonAppearanceCombo.append_text(_("Text and Icon"));
            menuButtonAppearanceCombo.append_text(_("Hidden"));
            menuButtonAppearanceCombo.connect('changed', (widget) => {
                if(widget.get_active() === Constants.MenuButtonAppearance.NONE){
                    menuButtonOffsetRow.visible = false;
                    menuButtonArrowIconBoxRow.visible = false;
                    menuButtonPaddingRow.visible = false;
                    menuButtonCustomTextBoxRow.visible = false;
                }
                else if(widget.get_active() === Constants.MenuButtonAppearance.ICON){
                    menuButtonArrowIconBoxRow.visible = true;
                    menuButtonPaddingRow.visible = true;
                    menuButtonCustomTextBoxRow.visible = false;
                    if (this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL || this.arcMenuPlacement === Constants.ArcMenuPlacement.DTP)
                        menuButtonOffsetRow.visible = true;
                    else
                        menuButtonOffsetRow.visible = false;
                }
                else{
                    menuButtonArrowIconBoxRow.visible = true;
                    menuButtonPaddingRow.visible = true;
                    if (this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL || this.arcMenuPlacement === Constants.ArcMenuPlacement.DTP)
                        menuButtonOffsetRow.visible = true;
                    else
                        menuButtonOffsetRow.visible = false;    
                    menuButtonCustomTextBoxRow.visible = true;
                }
                this._settings.set_enum('menu-button-appearance', widget.get_active());
            });
            menuButtonAppearanceRow.add_suffix(menuButtonAppearanceCombo);

            let menuButtonArrowIconBoxRow = new Adw.ActionRow({
                title: _('Show Arrow')
            });
            let enableArrowIconSwitch = new Gtk.Switch({ 
                valign: Gtk.Align.CENTER
            });
            enableArrowIconSwitch.set_active(this._settings.get_boolean('enable-menu-button-arrow'));
            enableArrowIconSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-menu-button-arrow', widget.get_active());
            });
            menuButtonArrowIconBoxRow.add_suffix(enableArrowIconSwitch);

            let menuButtonPaddingRow = new Adw.ActionRow({
                title: _('Menu Button Padding')
            });
            let menuButtonPadding = this._settings.get_int('button-padding');

            let paddingScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({
                    lower: -1,
                    upper: 25,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                valign: Gtk.Align.CENTER,
                hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            paddingScale.add_mark(-1, Gtk.PositionType.TOP, _("Default"));
            paddingScale.set_value(menuButtonPadding);
            paddingScale.connect('value-changed', () => {
                this._settings.set_int('button-padding', paddingScale.get_value());
                this._settings.set_boolean('reload-theme', true);
            });
            menuButtonPaddingRow.add_suffix(paddingScale);

            ///// Row for menu button offset /////
            let menuButtonOffsetRow = new Adw.ActionRow({
                title: _('Menu Button Position')
            });
            let menuButtonOffset = this._settings.get_int('menu-button-position-offset');

            let offsetScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 10, // arbitrary value
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                valign: Gtk.Align.CENTER,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            offsetScale.add_mark(0, Gtk.PositionType.TOP, _("Default")); // offset 0 is default
            offsetScale.add_mark(1, Gtk.PositionType.TOP, null);
            offsetScale.add_mark(2, Gtk.PositionType.TOP, null);
            offsetScale.set_value(menuButtonOffset);
            offsetScale.connect('value-changed', () => {
                this._settings.set_int('menu-button-position-offset', offsetScale.get_value());
            });
            menuButtonOffsetRow.add_suffix(offsetScale);
            ////////////////////

            let menuButtonCustomTextBoxRow = new Adw.ActionRow({
                title: _('Text')
            });
            let menuButtonCustomTextEntry = new Gtk.Entry({ 
                valign: Gtk.Align.CENTER,
            });
            menuButtonCustomTextEntry.set_width_chars(30);
            menuButtonCustomTextEntry.set_text(this._settings.get_string('custom-menu-button-text'));
            menuButtonCustomTextEntry.connect('changed', (widget) => {
                let customMenuButtonText = widget.get_text();
                this._settings.set_string('custom-menu-button-text', customMenuButtonText);
            });
            menuButtonCustomTextBoxRow.add_suffix(menuButtonCustomTextEntry);
            
            menuButtonAppearanceFrame.add(menuButtonAppearanceRow);
            menuButtonAppearanceFrame.add(menuButtonCustomTextBoxRow);
            menuButtonAppearanceFrame.add(menuButtonArrowIconBoxRow);
            menuButtonAppearanceFrame.add(menuButtonPaddingRow);
            menuButtonAppearanceFrame.add(menuButtonOffsetRow);
            this.append(menuButtonAppearanceFrame);

            menuButtonAppearanceCombo.set_active(this._settings.get_enum('menu-button-appearance'));

            let menuButtonIconFrame = new Adw.PreferencesGroup({
                title: _('Icon Appearance')
            });
            let menuButtonIconRow = new Adw.ActionRow({
                title: _('Icon')
            });

            let menuButtonIconButton = new PW.Button({
                title: _("Browse Icons") + " ",
                icon_name: 'icon-preview-symbolic',
                valign: Gtk.Align.CENTER,
            });
            menuButtonIconButton.connect('clicked', () => {
                let dialog = new ArcMenuIconsDialogWindow(this._settings, this);
                dialog.show();
                dialog.connect('response', ()=> {
                    dialog.destroy();
                });
            });

            menuButtonIconRow.add_suffix(menuButtonIconButton);
            menuButtonIconFrame.add(menuButtonIconRow);

            let menuButtonIconSizeRow = new Adw.ActionRow({
                title: _('Icon Size')
            });
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let menuButtonIconSizeScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({
                    lower: 14,
                    upper: 64,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                valign: Gtk.Align.CENTER,
                hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            menuButtonIconSizeScale.set_value(iconSize);
            menuButtonIconSizeScale.connect('value-changed', () => {
                this._settings.set_double('custom-menu-button-icon-size', menuButtonIconSizeScale.get_value());
            });
            menuButtonIconSizeRow.add_suffix(menuButtonIconSizeScale);
            menuButtonIconFrame.add(menuButtonIconSizeRow);

            this.append(menuButtonIconFrame);

            this.menuButtonIconColorFrame = new Adw.PreferencesGroup({
                title: _('Menu Button Styling')
            });

            let[menuButtonColorSwitch, menuButtonColorChooser] = this.newColorChooserRow({
                color: this.menuButtonColor,
                label: _("Color"),
                settingColorName: 'menu-button-color',
                settingOverrideName: 'override-menu-button-color',
            });

            let[menuButtonHoverColorSwitch, menuButtonHoverColorChooser] = this.newColorChooserRow({
                color: this.menuButtonHoverColor,
                label: _("Hover Color"),
                settingColorName: 'menu-button-hover-color',
                settingOverrideName: 'override-menu-button-hover-color',
            });

            let[menuButtonActiveColorSwitch, menuButtonActiveColorChooser] = this.newColorChooserRow({
                color: this.menuButtonActiveColor,
                label: _("Active Color"),
                settingColorName: 'menu-button-active-color',
                settingOverrideName: 'override-menu-button-active-color',
            });

            let[menuButtonHoverBackgroundcolorSwitch, menuButtonHoverBackgroundcolorChooser] = this.newColorChooserRow({
                color: this.menuButtonHoverBackgroundcolor,
                label: _("Hover Background Color"),
                settingColorName: 'menu-button-hover-backgroundcolor',
                settingOverrideName: 'override-menu-button-hover-background-color',
            });

            let[menuButtonActiveBackgroundcolorSwitch, menuButtonActiveBackgroundcolorChooser] = this.newColorChooserRow({
                color: this.menuButtonActiveBackgroundcolor,
                label: _("Active Background Color"),
                settingColorName: 'menu-button-active-backgroundcolor',
                settingOverrideName: 'override-menu-button-active-background-color',
            });

            let roundedCornersRow = new Adw.ActionRow({
                title: _("Override Border Radius")
            });
            let roundedCornersSwitch = new Gtk.Switch({
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                active: this._settings.get_boolean('menu-button-override-border-radius')
            });
            roundedCornersSwitch.connect("notify::active", (widget)=> {
                this._settings.set_boolean('menu-button-override-border-radius', widget.get_active())
                this._settings.set_boolean('reload-theme', true);
                menuButtonBorderRadiusRow.set_sensitive(widget.get_active());
            });
            roundedCornersRow.add_suffix(roundedCornersSwitch);

            this.menuButtonIconColorFrame.add(roundedCornersRow);

            let menuButtonBorderRadiusRow = new Adw.ActionRow({
                title: _("Border Radius")
            });
            let borderRadius = this._settings.get_int('menu-button-border-radius');
            let menuButtonBorderRadiusScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 20,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                valign: Gtk.Align.CENTER,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            menuButtonBorderRadiusScale.set_value(borderRadius);
            menuButtonBorderRadiusScale.connect('value-changed', () => {
                this._settings.set_int('menu-button-border-radius', menuButtonBorderRadiusScale.get_value());
                this._settings.set_boolean('reload-theme', true);
            });

            menuButtonBorderRadiusRow.add_suffix(menuButtonBorderRadiusScale);
            menuButtonBorderRadiusRow.set_sensitive(this._settings.get_boolean('menu-button-override-border-radius'));
            this.menuButtonIconColorFrame.add(menuButtonBorderRadiusRow);

            this.append(this.menuButtonIconColorFrame);

            this.restoreDefaults = () => {
                menuButtonAppearanceCombo.set_active(0);
                menuButtonCustomTextEntry.set_text('Applications');
                paddingScale.set_value(-1);
                menuButtonIconSizeScale.set_value(20);
                let colorParse = new Gdk.RGBA();
                colorParse.parse('rgb(240,240,240)');
                menuButtonActiveColorChooser.set_rgba(colorParse);
                menuButtonColorChooser.set_rgba(colorParse);
                colorParse.parse('rgb(214,214,214)');
                menuButtonHoverColorChooser.set_rgba(colorParse);
                colorParse.parse('rgba(238,238,236,0.1)');
                menuButtonHoverBackgroundcolorChooser.set_rgba(colorParse);
                colorParse.parse('rgba(238,238,236,0.18)');
                menuButtonActiveBackgroundcolorChooser.set_rgba(colorParse);
                enableArrowIconSwitch.set_active(false);
                menuButtonColorSwitch.set_active(false);
                menuButtonHoverColorSwitch.set_active(false);
                menuButtonActiveColorSwitch.set_active(false);
                menuButtonHoverBackgroundcolorSwitch.set_active(false);
                menuButtonActiveBackgroundcolorSwitch.set_active(false);
                roundedCornersSwitch.set_active(false);
                menuButtonBorderRadiusScale.set_value(0);
                offsetScale.set_value(0);
                this._settings.reset('menu-button-icon');
                this._settings.reset('arc-menu-icon');
                this._settings.reset('distro-icon');
                this._settings.reset('custom-menu-button-icon');
                this._settings.reset('menu-button-hover-color');
                this._settings.reset('menu-button-active-color');
                this._settings.reset('menu-button-hover-backgroundcolor');
                this._settings.reset('menu-button-active-backgroundcolor');
                this._settings.reset('menu-button-color');
                this._settings.reset('override-menu-button-hover-color');
                this._settings.reset('override-menu-button-active-color');
                this._settings.reset('override-menu-button-hover-background-color');
                this._settings.reset('override-menu-button-active-background-color');
                this._settings.reset('override-menu-button-color');
                this._settings.reset('menu-button-override-border-radius');
                this._settings.reset('menu-button-border-radius');
                this._settings.reset('menu-button-position-offset');
                this._settings.set_boolean('reload-theme', true);
            };
        }

        newColorChooserRow(params){
            let colorParse = new Gdk.RGBA();
            let colorRow = new Adw.ActionRow({
                title: _(params.label)
            });
            let buttonsGrid = new Gtk.Grid({
                margin_top: 0,
                margin_bottom: 0,
                valign: Gtk.Align.CENTER,
                column_spacing: 10
            });
            let colorSwitch = new Gtk.Switch({
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                active: this._settings.get_boolean(params.settingOverrideName)
            });
            colorSwitch.connect("notify::active", (widget)=> {
                this._settings.set_boolean(params.settingOverrideName, widget.get_active())
                colorChooser.sensitive = widget.get_active();
                this._settings.set_boolean('reload-theme', true);
            });

            let colorChooser = new Gtk.ColorButton({
                use_alpha: true,
                sensitive: colorSwitch.get_active()
            });

            colorParse.parse(params.color);
            colorChooser.set_rgba(colorParse);

            colorChooser.connect('color-set', ()=>{
                params.color = colorChooser.get_rgba().to_string();
                this._settings.set_string(params.settingColorName, params.color);
                this._settings.set_boolean('reload-theme', true);
            });

            buttonsGrid.attach(colorSwitch, 0, 0, 1, 1);
            buttonsGrid.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 1, 0, 1, 1);
            buttonsGrid.attach(colorChooser, 2, 0, 1, 1);
            colorRow.add_suffix(buttonsGrid);
            this.menuButtonIconColorFrame.add(colorRow);
            return [colorSwitch, colorChooser];
        }
});

var ArcMenuIconsDialogWindow = GObject.registerClass(
    class Arc_Menu_ArcMenuIconsDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            super._init(_('ArcMenu Icons'), parent);
            this.set_default_size(550, 400);
        }

        _createLayout(vbox){
            this.stack = new Gtk.Stack({
                halign: Gtk.Align.FILL,
                hexpand: true,
                transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
            });

            let arcMenuIconsBox = new Gtk.ScrolledWindow();

            let arcMenuIconsFlowBox = new PW.IconGrid();
            arcMenuIconsFlowBox.connect('child-activated', ()=> {
                distroIconsBox.unselect_all();
                customIconFlowBox.unselect_all();
                let selectedChild = arcMenuIconsFlowBox.get_selected_children();
                let selectedChildIndex = selectedChild[0].get_index();
                this._settings.set_enum('menu-button-icon', Constants.MenuIcon.ARC_MENU);
                this._settings.set_int('arc-menu-icon', selectedChildIndex);
            });
            arcMenuIconsBox.set_child(arcMenuIconsFlowBox);
            Constants.MenuIcons.forEach((icon)=>{
                let iconName = icon.PATH.replace("/media/icons/menu_button_icons/icons/", '');
                iconName = iconName.replace(".svg", '');
                let iconImage = new Gtk.Image({
                    icon_name: iconName,
                    pixel_size: 36
                });
                arcMenuIconsFlowBox.add(iconImage);
            });

            let distroIconsBox = new PW.IconGrid();
            distroIconsBox.connect('child-activated', ()=> {
                arcMenuIconsFlowBox.unselect_all();
                customIconFlowBox.unselect_all();
                let selectedChild = distroIconsBox.get_selected_children();
                let selectedChildIndex = selectedChild[0].get_index();
                this._settings.set_enum('menu-button-icon', Constants.MenuIcon.DISTRO_ICON);
                this._settings.set_int('distro-icon', selectedChildIndex);
            });
            Constants.DistroIcons.forEach((icon)=>{
                let iconImage;
                if(icon.PATH === 'start-here-symbolic'){
                    iconImage = new Gtk.Image({
                        icon_name: 'start-here-symbolic',
                        pixel_size: 36
                    });
                }
                else{
                    let iconName1 = icon.PATH.replace("/media/icons/menu_button_icons/distro_icons/", '');
                    iconName1 = iconName1.replace(".svg", '');
                    iconImage = new Gtk.Image({
                        icon_name: iconName1,
                        pixel_size: 36
                    });
                }
                distroIconsBox.add(iconImage);
            });

            let customIconBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL
            });
            let customIconFlowBox = new PW.IconGrid();
            customIconFlowBox.vexpand = false;
            customIconFlowBox.homogeneous = false;
            customIconFlowBox.connect('child-activated', ()=> {
                arcMenuIconsFlowBox.unselect_all();
                distroIconsBox.unselect_all();
                let customIconPath = this._settings.get_string('custom-menu-button-icon');
                this._settings.set_string('custom-menu-button-icon', customIconPath)
                this._settings.set_enum('menu-button-icon', Constants.MenuIcon.CUSTOM);
            });
            customIconBox.append(customIconFlowBox);
            let customIconImage = new Gtk.Image({
                gicon: Gio.icon_new_for_string(this._settings.get_string('custom-menu-button-icon')),
                pixel_size: 36
            });
            customIconFlowBox.add(customIconImage);

            let fileChooserFrame = new PW.FrameBox();
            fileChooserFrame.margin_top = 20;
            fileChooserFrame.margin_bottom = 20;
            fileChooserFrame.margin_start = 20;
            fileChooserFrame.margin_end = 20;
            let fileChooserRow = new PW.FrameBoxRow();
            let fileChooserLabel = new Gtk.Label({
                label: _('Browse for a Custom Icon'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.Button({
                label: _('Select an Icon')
            });
            fileChooserButton.connect('clicked', (widget) => {
                let dialog = new Gtk.FileChooserDialog({
                    title: _('Select an Icon'),
                    transient_for: this.get_root(),
                    modal: true,
                    action: Gtk.FileChooserAction.OPEN,
                });

                if(dialog.get_parent())
                    dialog.unparent();
                dialog.set_filter(fileFilter);

                dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
                dialog.add_button("_Open", Gtk.ResponseType.ACCEPT);

                dialog.connect("response", (self, response) => {
                    if(response === Gtk.ResponseType.ACCEPT){
                        arcMenuIconsFlowBox.unselect_all();
                        distroIconsBox.unselect_all();
                        customIconImage.gicon = Gio.icon_new_for_string(dialog.get_file().get_path());
                        this._settings.set_string('custom-menu-button-icon', dialog.get_file().get_path());
                        this._settings.set_enum('menu-button-icon', Constants.MenuIcon.CUSTOM);
                        customIconFlowBox.select_child(customIconFlowBox.get_child_at_index(0));
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                })

                dialog.show();
            });

            fileChooserRow.add(fileChooserLabel);
            fileChooserRow.add(fileChooserButton);
            fileChooserFrame.add(fileChooserRow);
            customIconBox.append(fileChooserFrame);

            this.stack.add_titled(arcMenuIconsBox, 'ArcMenu Icons', _('ArcMenu Icons'));
            this.stack.add_titled(distroIconsBox, 'Distro Icons', _('Distro Icons'));
            this.stack.add_titled(customIconBox, 'Custom Icon', _('Custom Icon'));

            let stackSwitcher = new Gtk.StackSwitcher({
                stack: this.stack,
                halign: Gtk.Align.CENTER
            });

            vbox.append(stackSwitcher);
            vbox.append(this.stack);
            if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARC_MENU)
                this.stack.set_visible_child_name('ArcMenu Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON)
                this.stack.set_visible_child_name('Distro Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM)
                this.stack.set_visible_child_name('Custom Icon');

            if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARC_MENU){
                let children = arcMenuIconsFlowBox.childrenCount;
                for(let i = 0; i < children; i++){
                    if(i === this._settings.get_int('arc-menu-icon')){
                        arcMenuIconsFlowBox.select_child(arcMenuIconsFlowBox.get_child_at_index(i));
                        break;
                    }
                }
            }
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON){
                let children = distroIconsBox.childrenCount;
                for(let i = 0; i < children; i++){
                    if(i === this._settings.get_int('distro-icon')){
                        distroIconsBox.select_child(distroIconsBox.get_child_at_index(i));
                        break;
                    }
                }
            }
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM){
                customIconFlowBox.select_child(customIconFlowBox.get_child_at_index(0));
            }

            let distroInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            distroInfoButton.halign = Gtk.Align.START;
            distroInfoButton.connect('clicked', ()=> {
                let dialog = new DistroIconsDisclaimerWindow(this._settings, this);
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show();
            });
            vbox.append(distroInfoButton);
        }

        setVisibleChild(){
            if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARC_MENU)
                this.stack.set_visible_child_name('ArcMenu Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON)
                this.stack.set_visible_child_name('Distro Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM)
                this.stack.set_visible_child_name('Custom Icon');
        }
});

var DistroIconsDisclaimerWindow = GObject.registerClass(
    class Arc_Menu_DistroIconsDisclaimerWindow extends Gtk.MessageDialog {
        _init(settings, parent) {
            this._settings = settings;
            super._init({
                text: "<b>" + _("Legal disclaimer for Distro Icons...") + "</b>",
                use_markup: true,
                message_type: Gtk.MessageType.OTHER,
                transient_for: parent.get_root(),
                modal: true,
                buttons: Gtk.ButtonsType.OK
            });

            let vbox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                homogeneous: false,
                margin_top: 5,
                margin_bottom: 5,
                margin_start: 5,
                margin_end: 5,
            });
            this.get_content_area().append(vbox);
            this._createLayout(vbox);
        }

        _createLayout(vbox) {
            let scrollWindow = new Gtk.ScrolledWindow({
                min_content_width: 500,
                max_content_width: 500,
                min_content_height: 400,
                max_content_height: 400,
                hexpand: false,
                halign: Gtk.Align.START,
            });
            scrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            let frame = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                hexpand: false,
                halign: Gtk.Align.START
            });

            let bodyLabel = new Gtk.Label({
                label: Constants.DistroIconsDisclaimer,
                use_markup: true,
                hexpand: false,
                halign: Gtk.Align.START,
                wrap: true
            });
            bodyLabel.set_size_request(500,-1);

            frame.append(bodyLabel);
            scrollWindow.set_child(frame);
            vbox.append(scrollWindow);
        }
});

var MenuLayoutPage = GObject.registerClass(
    class Arc_Menu_MenuLayoutPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: _('Layouts'),
                icon_name: 'menu-layouts-symbolic'
            });
            this._settings = settings;

            let mainGroup = new Adw.PreferencesGroup();
            this.add(mainGroup);

            let mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });

            this.stack = new Gtk.Stack({
                hhomogeneous: true,
                transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
            });
            this.stack.add_named(mainBox, "LayoutsBox");
            mainGroup.add(this.stack);

            let currentLayoutGroup = new Adw.PreferencesGroup({
                title: _("Current Menu Layout"),
            });
            let currentLayoutName = this.getMenuLayoutName(this._settings.get_enum('menu-layout'));
            let currentLayoutImagePath = this.getMenuLayoutImagePath(this._settings.get_enum('menu-layout'));
            let imagePixelSize = 155;
            let currentLayoutBoxRow = new PW.MenuLayoutRow(currentLayoutName, currentLayoutImagePath, imagePixelSize);
            
            currentLayoutBoxRow.connect('activated', () => {
                this.displayLayoutTweaksPage();
            });

            currentLayoutGroup.add(currentLayoutBoxRow);
            mainBox.append(currentLayoutGroup);

            let availableLayoutGroup = new Adw.PreferencesGroup({
                title: _("Available Menu Layouts"),
            });
            mainBox.append(availableLayoutGroup);

            Constants.MenuStyles.STYLES.forEach((style) => {
                let tile = new PW.MenuLayoutRow(_("%s Menu Layouts", style.TITLE).format(style.TITLE) , style.IMAGE, 46, style);
                availableLayoutGroup.add(tile);

                let menuLayoutsBox = new MenuLayoutCategoryPage(this._settings, this, tile, style.TITLE);
                menuLayoutsBox.connect('menu-layout-response', (dialog, response) => {
                    if(response === -10) {
                        this._settings.set_enum('menu-layout', dialog.index);
                        this._settings.set_boolean('reload-theme', true);
                        currentLayoutBoxRow.label.label = "<b>" + this.getMenuLayoutName(dialog.index) + "</b>";
                        tweaksLabel.label = this.getMenuLayoutTweaksName(dialog.index);
                        currentLayoutBoxRow.image.gicon = Gio.icon_new_for_string(this.getMenuLayoutImagePath(dialog.index));
                        this.stack.set_visible_child_name("LayoutsBox");
                    }
                    if(response === -20){
                        this.stack.set_visible_child_name("LayoutsBox");
                    }
                });
                this.stack.add_named(menuLayoutsBox, "Layout_" + style.TITLE);
                tile.connect('activated', ()=> {
                    this.stack.set_visible_child_name("Layout_" + style.TITLE);
                    menuLayoutsBox.enableSelectionMode();
                });
            });

            this.layoutsTweaksPage = new LayoutTweaks.tweaks.TweaksPage(this._settings, this.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')));
            this.layoutsTweaksPage.connect("response", (page, response) => {
                if(response === -20)
                    this.stack.set_visible_child_name("LayoutsBox");
            });
            let tweaksLabel = new Gtk.Label({
                label: this.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')),
                use_markup: true,
                halign: Gtk.Align.END,
                vexpand: true,
                hexpand: true
            });

            this.stack.add_named(this.layoutsTweaksPage, "LayoutsTweaks")
            this.stack.set_visible_child_name("LayoutsBox");
    }

    displayLayoutTweaksPage(){
        let layoutName = this.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout'));
        this.layoutsTweaksPage.setActiveLayout(this._settings.get_enum('menu-layout'), layoutName);
        this.stack.set_visible_child_name("LayoutsTweaks");
    }

    displayRunnerTweaksPage(){
        if(!this.runnerTweaksPage){
            let activeLayoutName = this.getMenuLayoutTweaksName(Constants.MenuLayout.RUNNER);
            this.runnerTweaksPage = new LayoutTweaks.tweaks.TweaksPage(this._settings, activeLayoutName);
            this.stack.add_named(this.runnerTweaksPage, "RunnerTweaks")
            this.runnerTweaksPage.connect("response", (page, response) => {
                if(response === -20)
                    this.stack.set_visible_child_name("LayoutsBox");
            });
            this.runnerTweaksPage.setActiveLayout(Constants.MenuLayout.RUNNER);
        }
        this.stack.set_visible_child_name("RunnerTweaks");
    }

    getMenuLayoutName(index){
        for(let styles of Constants.MenuStyles.STYLES){
            for(let style of styles.MENU_TYPE){
                if(style.LAYOUT == index){
                    return _(style.TITLE);
                }
            }
        }
    }

    getMenuLayoutTweaksName(index){
        for(let styles of Constants.MenuStyles.STYLES){
            for(let style of styles.MENU_TYPE){
                if(style.LAYOUT == index){
                    return _("%s Layout Tweaks", style.TITLE).format(style.TITLE);
                }
            }
        }
    }

    getMenuLayoutImagePath(index){
        for(let styles of Constants.MenuStyles.STYLES){
            for(let style of styles.MENU_TYPE){
                if(style.LAYOUT == index){
                    return style.IMAGE;
                }
            }
        }
    }
});

var MenuLayoutCategoryPage = GObject.registerClass({
    Signals: {
        'menu-layout-response': { param_types: [GObject.TYPE_INT] },
    },
},  class Arc_Menu_MenuLayoutCategoryPage extends Adw.PreferencesGroup {
        _init(settings, parent, tile, title) {
            super._init();

            this._parent = parent;
            this._settings = settings;
            this.index = this._settings.get_enum('menu-layout');
            this.layoutStyle = tile.layout;

            this._params = {
                maxColumns: tile.layout.length > 3 ? 3 : tile.layout.length,
                imageHeight: 155,
                imageWidth: 155,
                styles: tile.layout
            };
            let layoutsFrame = new Adw.PreferencesGroup();
            let layoutsRow = new Adw.PreferencesRow({
                selectable: false,
                activatable: false
            });
            layoutsFrame.add(layoutsRow);

            let buttonBox = new Gtk.Box({
                spacing: 10,
                margin_bottom: 10
            });
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: false,
                halign: Gtk.Align.END
            });
            let context = applyButton.get_style_context();
            context.add_class('suggested-action');
            applyButton.connect('clicked', ()=> {
                let selectedBox = this._tileGrid.get_selected_children();
                this.index = selectedBox[0].get_child().layout;
                this._tileGrid.unselect_all();
                applyButton.set_sensitive(false);
                this.emit('menu-layout-response', -10);
            });
            let backButton = new PW.Button({
                icon_name: 'go-previous-symbolic',
                title: _("Back"),
                icon_first: true,
                halign: Gtk.Align.START
            });
            context = backButton.get_style_context();
            context.add_class('suggested-action');
            backButton.connect('clicked', ()=> {
                this.emit('menu-layout-response', -20);
            });
            buttonBox.append(backButton);
            let chooseNewLayoutLabel = new Gtk.Label({
                label: "<b>" +  _("%s Menu Layouts", title).format(title) + "</b>",
                use_markup: true,
                halign: Gtk.Align.CENTER,
                hexpand: true
            });
            buttonBox.append(chooseNewLayoutLabel);
            buttonBox.append(applyButton);
            applyButton.set_sensitive(false);

            this.add(buttonBox);
            this.add(layoutsFrame);
            this._tileGrid = new PW.TileGrid(this._params.maxColumns);

            this._params.styles.forEach((style) => {
                this._addTile(style.TITLE, style.IMAGE, style.LAYOUT);
            });

            layoutsRow.set_child(this._tileGrid);

            this._tileGrid.connect('selected-children-changed', () => {
                applyButton.set_sensitive(true);
            });

            this._tileGrid.set_selection_mode(Gtk.SelectionMode.NONE);
        }

        enableSelectionMode(){
            this._tileGrid.set_selection_mode(Gtk.SelectionMode.SINGLE);
        }

        _addTile(name, image, layout) {
            let tile = new PW.Tile(name, image, this._params.imageWidth, this._params.imageHeight, layout);
            this._tileGrid.insert(tile, -1);
        }
});

var MenuThemePage = GObject.registerClass(
    class Arc_Menu_MenuThemePage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: _('Theme'),
                icon_name: 'menu-theme-symbolic'
            });
            this._settings = settings;
            this.heightValue = this._settings.get_int('menu-height');
            this.rightPanelWidth = this._settings.get_int('right-panel-width');
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');

            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.highlightForegroundColor = this._settings.get_string('highlight-foreground-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.menuWidth = this._settings.get_int('menu-width');
            this.updatePresetComboBox = true;
            this.emitChange = true;
            this.checkIfPresetMatch();

            let overrideArcMenuFrame = new Adw.PreferencesGroup({
                title: _('Enable Custom Menu Theme')
            });
            let overrideArcMenuRow = new Adw.ActionRow({
                title: _("Override Menu Theme")
            });
            let overrideArcMenuSwitch = new Gtk.Switch({
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            overrideArcMenuSwitch.set_active(this._settings.get_boolean('enable-custom-arc-menu'));
            overrideArcMenuSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-custom-arc-menu',widget.get_active());
                this._settings.set_boolean('reload-theme', true);
                if(widget.get_active()){
                    this.add(this.colorPresetFrame);
                    this.add(this.themeSettingsFrame);
                }
                else{
                    this.remove(this.colorPresetFrame);
                    this.remove(this.themeSettingsFrame);
                }
            });
            overrideArcMenuRow.add_suffix(overrideArcMenuSwitch);
            overrideArcMenuFrame.add(overrideArcMenuRow);
            this.add(overrideArcMenuFrame);

            this.createOverrideArcMenuThemeGroups();

            if(overrideArcMenuSwitch.get_active()){
                this.add(this.colorPresetFrame);
                this.add(this.themeSettingsFrame);
            }
            else{
                this.remove(this.colorPresetFrame);
                this.remove(this.themeSettingsFrame);
            }
                
        }

        setMenuThemeSettings(){
            this._settings.set_string('separator-color', this.separatorColor);
            this._settings.set_boolean('vert-separator', this.verticalSeparator);
            this._settings.set_string('menu-color', this.menuColor);
            this._settings.set_string('menu-foreground-color', this.menuForegroundColor);
            this._settings.set_string('border-color', this.borderColor);
            this._settings.set_string('highlight-color', this.highlightColor );
            this._settings.set_string('highlight-foreground-color', this.highlightForegroundColor);
            this._settings.set_int('menu-font-size', this.fontSize);
            this._settings.set_int('menu-border-size', this.borderSize);
            this._settings.set_int('menu-corner-radius', this.cornerRadius);
            this._settings.set_int('menu-margin', this.menuMargin);
            this._settings.set_int('menu-arrow-size', this.menuArrowSize);
            this._settings.set_boolean('reload-theme', true);
        }

        checkIfPresetMatch(){
            this.presetName = "Custom Theme";
            this.currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.highlightForegroundColor, this.separatorColor,
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(),
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
            let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i < all_color_themes.length; i++){
                this.isEqual = true;
                for(let l = 0; l < this.currentSettingsArray.length; l++){
                    if(this.currentSettingsArray[l] !== all_color_themes[i][l + 1]){
                        this.isEqual = false;
                        break;
                    }
                }
                if(this.isEqual){
                    this.presetName = all_color_themes[i][0];
                    this.updatePresetComboBox = false;
                    this.colorPresetCombo?.set_active(i);
                    this.updatePresetComboBox = true;
                    break;
                }
            }
            if(!this.isEqual){
                this.colorPresetCombo?.set_active(-1);
            }
        }

        createIconList(store){
            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i= 0; i<this.color_themes.length; i++){
                let text = this.color_themes[i][0];
                let color1 = this.color_themes[i][1];
                let color2 = this.color_themes[i][2];
                let color3 = this.color_themes[i][4];
                let color4 = this.color_themes[i][5];
                let xpm = Utils.createXpmImage(color1, color2, color3, color4);
                let pixbuf = GdkPixbuf.Pixbuf.new_from_xpm_data(xpm);

                store.set(store.append(), [0, 1], [pixbuf, _(text)]);
            }
        }

        createOverrideArcMenuThemeGroups(){
            this.colorPresetFrame = new Adw.PreferencesGroup({
                title: _('Menu Theme Presets')
            });
            let colorPresetRow = new Adw.ActionRow({
                title: _("Current Menu Theme Preset")
            });
            let store = new Gtk.ListStore();
            store.set_column_types([GdkPixbuf.Pixbuf, GObject.TYPE_STRING]);
            this.colorPresetCombo = new Gtk.ComboBox({
                model: store,
                valign: Gtk.Align.CENTER
            });

            this.createIconList(store);

            let renderer = new Gtk.CellRendererPixbuf({xpad: 5});
            this.colorPresetCombo.pack_start(renderer, false);
            this.colorPresetCombo.add_attribute(renderer, "pixbuf", 0);
            renderer = new Gtk.CellRendererText();
            this.colorPresetCombo.pack_start(renderer, true);
            this.colorPresetCombo.add_attribute(renderer, "text", 1);

            this.saveButton = new Gtk.Button({
                label: _("Save as Preset"),
                valign: Gtk.Align.CENTER
            });
            this.checkIfPresetMatch();
            this.colorPresetCombo.connect('changed', (widget) => {
                if(this.updatePresetComboBox){
                    let index = widget.get_active();
                    /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Hightlight Foreground Color", "Separator Color"
                                            , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                    if(index>=0){
                        this.menuColor = this.color_themes[index][1];
                        this.menuForegroundColor = this.color_themes[index][2];
                        this.borderColor = this.color_themes[index][3];
                        this.highlightColor = this.color_themes[index][4];
                        this.highlightForegroundColor = this.color_themes[index][5];
                        this.separatorColor = this.color_themes[index][6];
                        this.fontSize = parseInt(this.color_themes[index][7]);
                        this.borderSize = parseInt(this.color_themes[index][8]);
                        this.cornerRadius = parseInt(this.color_themes[index][9]);
                        this.menuArrowSize = parseInt(this.color_themes[index][10]);
                        this.menuMargin = parseInt(this.color_themes[index][11]);
                        this.verticalSeparator = (this.color_themes[index][12] === 'true');

                        this.emitChange = false;
                        this.presetName=this.color_themes[index][0];
                        color.parse(this.menuColor);
                        menuBackgroudColorChooser.set_rgba(color);

                        color.parse(this.menuForegroundColor);
                        menuForegroundColorChooser.set_rgba(color);

                        fontScale.set_value(this.fontSize);

                        color.parse(this.borderColor);
                        borderColorChooser.set_rgba(color);

                        borderScale.set_value(this.borderSize);

                        color.parse(this.highlightColor);
                        itemColorChooser.set_rgba(color);

                        color.parse(this.highlightForegroundColor);
                        itemForegroundColorChooser.set_rgba(color);

                        cornerScale.set_value(this.cornerRadius);
                        marginScale.set_value(this.menuMargin);
                        arrowScale.set_value(this.menuArrowSize);

                        vertSeparatorSwitch.set_active(this.verticalSeparator);
                        color.parse(this.separatorColor);
                        colorChooser.set_rgba(color);
                        this.saveButton.set_sensitive(false);
                        this.setMenuThemeSettings();

                        this.emitChange = true;
                    }
                }
            });
            colorPresetRow.add_suffix(this.colorPresetCombo);
            this.colorPresetFrame.add(colorPresetRow);

            let presetsButtonRow = new Adw.ActionRow();

            this.saveButton.connect('clicked', () => {
                /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Separator Color"
                                , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                let dialog = new ColorThemeDialogWindow(this._settings, this);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY){
                        let array = [dialog.themeName, this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.highlightForegroundColor, this.separatorColor,
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(),
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
                        this.color_themes.push(array);
                        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        dialog.destroy();
                    }
                });
            });

            let manageButton = new Gtk.Button({
                label: _("Manage Presets"),
                valign: Gtk.Align.CENTER
            });
            manageButton.connect('clicked', ()=> {
                let dialog = new ManageColorThemeDialogWindow(this._settings, this);
                dialog.show();
                dialog.connect('response', (_w, response)=>{
                    if(response === Gtk.ResponseType.APPLY){
                        this.color_themes = dialog.color_themes;
                        this._settings.set_value('color-themes',new GLib.Variant('aas',dialog.color_themes));
                        dialog.destroy();
                    }
                });
            });
            let addButton = new PW.Button({
                title: _("Browse Presets"),
                icon_name: "browse-presets-symbolic",
                valign: Gtk.Align.CENTER
            });
            addButton.connect('clicked', () => {
                let settingsFile = Gio.File.new_for_path(Me.path + '/media/misc/ArcMenuDefaultPresets');
                let [ success, content, etags] = settingsFile.load_contents(null);
                let string = ByteArray.toString(content);
                let themes = string.split("\n")
                themes.pop(); //remove last blank array
                let colorThemes = [];
                for(let i = 0; i < themes.length; i++){
                    let array = themes[i].split('//')
                    array.pop();
                    colorThemes.push(array);
                }
                let dialog = new ExportColorThemeDialogWindow(this._settings, this, colorThemes);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY){
                        let selectedThemes = dialog.selectedThemes;
                        this.color_themes = this._settings.get_value('color-themes').deep_unpack();
                        for(let i = 0; i < selectedThemes.length; i++){
                            this.color_themes.push(selectedThemes[i]);
                        }
                        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        dialog.destroy();
                    }
                });
            });

            presetsButtonRow.add_prefix(addButton);
            presetsButtonRow.add_prefix(manageButton);
            presetsButtonRow.add_suffix(this.saveButton);
            this.colorPresetFrame.add(presetsButtonRow);
            this.add(this.colorPresetFrame);

            this._settings.connect("changed::color-themes", () => {
                store.clear();
                this.createIconList(store);
                this.colorPresetCombo.model = store;
                this.colorPresetCombo.show();

                this.checkIfPresetMatch();
            });

            this.themeSettingsFrame = new Adw.PreferencesGroup({
                title: _('Theme Settings')
            })
            this.add(this.themeSettingsFrame);

            //ROW 1 - MENU BACKGROUND COLOR--------------------------------------
            let menuBackgroudColorRow = new Adw.ActionRow({
                title: _('Menu Background Color')
            });

            let menuBackgroudColorChooser = new Gtk.ColorButton({
                use_alpha: true,
                valign: Gtk.Align.CENTER
            });
            let color = new Gdk.RGBA();
            color.parse(this.menuColor);
            menuBackgroudColorChooser.set_rgba(color);
            menuBackgroudColorChooser.connect('color-set', () => {
                this.menuColor = menuBackgroudColorChooser.get_rgba().to_string();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            menuBackgroudColorRow.add_suffix(menuBackgroudColorChooser);
            this.themeSettingsFrame.add(menuBackgroudColorRow);

            //ROW 2 - MENU FOREGROUND COLOR--------------------------------------
            let menuForegroundColorRow = new Adw.ActionRow({
                title: _('Menu Foreground Color')
            });

            let menuForegroundColorChooser = new Gtk.ColorButton({
                use_alpha: true,
                valign: Gtk.Align.CENTER
            });
            color.parse(this.menuForegroundColor);
            menuForegroundColorChooser.set_rgba(color);
            menuForegroundColorChooser.connect('color-set', () => {
                this.menuForegroundColor = menuForegroundColorChooser.get_rgba().to_string();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            menuForegroundColorRow.add_suffix(menuForegroundColorChooser);
            this.themeSettingsFrame.add(menuForegroundColorRow);

            //ROW 3 - FONT SIZE--------------------------------------------------
            let fontSizeRow = new Adw.ActionRow({
                title: _('Font Size')
            });

            let fontScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                valign: Gtk.Align.CENTER,
                adjustment: new Gtk.Adjustment({lower: 8, upper: 14, step_increment: 1, page_increment: 1, page_size: 0 }),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            fontScale.set_value(this.fontSize);
            fontScale.connect('value-changed', () => {
                this.fontSize = fontScale.get_value();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            fontSizeRow.add_suffix(fontScale);
            this.themeSettingsFrame.add(fontSizeRow);

            //ROW 4- Border Color-------------------------------------------------
            let borderColorRow = new Adw.ActionRow({
                title: _('Border Color')
            });
            let borderColorChooser = new Gtk.ColorButton({
                use_alpha: true,
                valign: Gtk.Align.CENTER
            });
            color = new Gdk.RGBA();
            color.parse(this.borderColor);
            borderColorChooser.set_rgba(color);
            borderColorChooser.connect('color-set', ()=>{
                this.borderColor = borderColorChooser.get_rgba().to_string();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            borderColorRow.add_suffix(borderColorChooser);
            this.themeSettingsFrame.add(borderColorRow);

            //ROW 5 - Border Size-------------------------------------------------------
            let borderSizeRow = new Adw.ActionRow({
                title: _('Border Size')
            });
            let borderScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({lower: 0, upper: 4, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT,
                valign: Gtk.Align.CENTER
            });
            borderScale.set_value(this.borderSize);
            borderScale.connect('value-changed', () => {
                this.borderSize = borderScale.get_value();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            borderSizeRow.add_suffix(borderScale);
            this.themeSettingsFrame.add(borderSizeRow);

            //ROW 6 - Active Item Background Color-----------------------------------------------
            let itemColorRow = new Adw.ActionRow({
                title: _('Active Item Background Color')
            });
            let itemColorChooser = new Gtk.ColorButton({
                use_alpha: true,
                valign: Gtk.Align.CENTER
            });
            color = new Gdk.RGBA();
            color.parse(this.highlightColor);
            itemColorChooser.set_rgba(color);
            itemColorChooser.connect('color-set', () => {
                this.highlightColor = itemColorChooser.get_rgba().to_string();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            itemColorRow.add_suffix(itemColorChooser);
            this.themeSettingsFrame.add(itemColorRow);

            //ROW 7 - Active Item Foreground Color-----------------------------------------------
            let itemForegroundColorRow = new Adw.ActionRow({
                title: _('Active Item Foreground Color')
            });

            let itemForegroundColorChooser = new Gtk.ColorButton({
                use_alpha: true,
                valign: Gtk.Align.CENTER
            });
            color = new Gdk.RGBA();
            color.parse(this.highlightForegroundColor);
            itemForegroundColorChooser.set_rgba(color);
            itemForegroundColorChooser.connect('color-set', () => {
                this.highlightForegroundColor = itemForegroundColorChooser.get_rgba().to_string();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            itemForegroundColorRow.add_suffix(itemForegroundColorChooser);
            this.themeSettingsFrame.add(itemForegroundColorRow);

            //ROW 8 - Corner Radius-----------------------------------------------------
            let cornerRadiusRow = new Adw.ActionRow({
                title: _('Corner Radius')
            });
            let cornerScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT,
                valign: Gtk.Align.CENTER
            });
            cornerScale.set_value(this.cornerRadius);
            cornerScale.connect('value-changed', () => {
                this.cornerRadius = cornerScale.get_value();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            cornerRadiusRow.add_suffix(cornerScale);
            this.themeSettingsFrame.add(cornerRadiusRow);

            //ROW 9 - Menu Arrow Size-------------------------------------------------------
            let menuMarginRow = new Adw.ActionRow({
                title: _('Menu Arrow Size')
            });
            let marginScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower: 0,upper: 30, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT,
                valign: Gtk.Align.CENTER
            });
            marginScale.set_value(this.menuMargin);
            marginScale.connect('value-changed', () => {
                this.menuMargin = marginScale.get_value();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            menuMarginRow.add_suffix(marginScale);
            this.themeSettingsFrame.add(menuMarginRow);

            //ROW 10 - Menu Displacement------------------------------------------------------
            let menuArrowRow = new Adw.ActionRow({
                title: _('Menu Displacement')
            });
            let arrowScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT,
                valign: Gtk.Align.CENTER
            });
            arrowScale.set_value(this.menuArrowSize);
            arrowScale.connect('value-changed', () => {
                this.menuArrowSize = arrowScale.get_value();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            menuArrowRow.add_suffix(arrowScale);
            this.themeSettingsFrame.add(menuArrowRow);

            //ROW 11 - Vertical Separator------------------------------------------------------
            let vertSeparatorRow = new Adw.ActionRow({
                title: _('Enable Vertical Separator')
            });
            let vertSeparatorSwitch = new Gtk.Switch({ 
                valign: Gtk.Align.CENTER
            });
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            vertSeparatorSwitch.connect('notify::active', (widget) => {
                this.verticalSeparator = widget.get_active();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            vertSeparatorRow.add_suffix(vertSeparatorSwitch);
            this.themeSettingsFrame.add(vertSeparatorRow);

            //ROW 12 - Separator Color------------------------------------------------------
            let separatorColorRow = new Adw.ActionRow({
                title: _('Separator Color')
            });

            let colorChooser = new Gtk.ColorButton({
                use_alpha: true,
                valign: Gtk.Align.CENTER
            });
            color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);
            colorChooser.connect('color-set', ()=>{
                this.separatorColor = colorChooser.get_rgba().to_string();
                if(this.emitChange){
                    this.setMenuThemeSettings();
                    this.checkIfPresetMatch();
                }
            });
            separatorColorRow.add_suffix(colorChooser);
            this.themeSettingsFrame.add(separatorColorRow);
        }
});

var MenuSettingsGeneralPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsGeneralPage extends Gtk.Box {
    _init(settings) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });

        this._settings = settings;
        this.heightValue = this._settings.get_int('menu-height');
        this.widthValue = this._settings.get_int('menu-width-adjustment');
        this.rightPanelWidth = this._settings.get_int('right-panel-width');
        this.menuWidth = this._settings.get_int('menu-width');
        this.forcedMenuLocation = this._settings.get_enum('force-menu-location');
        this.verticalSeparator = this._settings.get_boolean('vert-separator');
        this.appDescriptions = this._settings.get_boolean('apps-show-extra-details');
        this.categoryIconType = this._settings.get_enum('category-icon-type');
        this.shortcutsIconType = this._settings.get_enum('shortcut-icon-type');

        let menuSizeFrame = new Adw.PreferencesGroup({
            title: _("Menu Size")
        });
        //find the greatest screen height of all monitors
        //use that value to set Menu Height cap
        let display = Gdk.Display.get_default();
        let monitors = display.get_monitors();
        let nMonitors = monitors.get_n_items();
        let greatestHeight = 0;
        let scaleFactor = 1;
        for (let i = 0; i < nMonitors; i++) {
            let monitor = monitors.get_item(i);
            let monitorHeight = monitor.get_geometry().height;
            if(monitorHeight > greatestHeight){
                scaleFactor = monitor.get_scale_factor();
                greatestHeight = monitorHeight;
            }
        }
        let monitorHeight = greatestHeight * scaleFactor;
        monitorHeight = Math.round((monitorHeight * 8) / 10);

        this.append(menuSizeFrame);
        let heightRow = new Adw.ActionRow({
            title: _('Height')
        });

        let heightSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 300, upper: monitorHeight, step_increment: 25, page_increment: 50, page_size: 0,
            }),
            climb_rate: 25,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
        });
        heightSpinButton.set_value(this.heightValue);
        heightSpinButton.connect('value-changed', (widget) => {
            this._settings.set_int('menu-height', widget.get_value());
        });
        heightRow.add_suffix(heightSpinButton);
        menuSizeFrame.add(heightRow);

        let menuWidthRow = new Adw.ActionRow({
            title: _('Left-Panel Width'),
            subtitle: _("Traditional Layouts")
        });

        let menuWidthSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 175, upper: 500, step_increment: 25, page_increment: 50, page_size: 0,
            }),
            climb_rate: 25,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
        });
        menuWidthSpinButton.set_value(this.menuWidth);
        menuWidthSpinButton.connect('value-changed', (widget) => {
            this._settings.set_int('menu-width', widget.get_value());
            this._settings.set_boolean('reload-theme', true);
        });
        menuWidthRow.add_suffix(menuWidthSpinButton);
        menuSizeFrame.add(menuWidthRow);

        let rightPanelWidthRow = new Adw.ActionRow({
            title: _('Right-Panel Width'),
            subtitle: _("Traditional Layouts")
        });
        let rightPanelWidthSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 200,upper: 500, step_increment: 25, page_increment: 50, page_size: 0,
            }),
            climb_rate: 25,
            valign: Gtk.Align.CENTER,
            digits: 0,
            numeric: true,
        });
        rightPanelWidthSpinButton.set_value(this.rightPanelWidth);
        rightPanelWidthSpinButton.connect('value-changed', (widget) => {
            this._settings.set_int('right-panel-width', widget.get_value());
            this._settings.set_boolean('reload-theme', true);
        });
        rightPanelWidthRow.add_suffix(rightPanelWidthSpinButton);
        menuSizeFrame.add(rightPanelWidthRow);

        let widthRow = new Adw.ActionRow({
            title: _('Width Offset'),
            subtitle: _("Non-Traditional Layouts")
        });
        let widthSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: -350, upper: 600, step_increment: 25, page_increment: 50, page_size: 0,
            }),
            valign: Gtk.Align.CENTER,
            climb_rate: 25,
            digits: 0,
            numeric: true,
        });
        widthSpinButton.set_value(this.widthValue);
        widthSpinButton.connect('value-changed', (widget) => {
            this._settings.set_int('menu-width-adjustment', widget.get_value());
            this._settings.set_boolean('reload-theme', true);
        });
        widthRow.add_suffix(widthSpinButton);
        menuSizeFrame.add(widthRow);

        let iconsSizeFrame = new Adw.PreferencesGroup({
            title: _("Menu Items Icon Size")
        });

        let gridIconsSizeRow = new Adw.ActionRow({
            title: _("Grid Icons")
        });
        this.gridIconsSizeCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        this.gridIconsSizeCombo.append("Default", _("Default"));
        this.gridIconsSizeCombo.append("Small", _("Small") + " - " + _("Square"));
        this.gridIconsSizeCombo.append("Medium", _("Medium") + " - " + _("Square"));
        this.gridIconsSizeCombo.append("Large", _("Large") + " - " + _("Square"));
        this.gridIconsSizeCombo.append("Small Rect", _("Small") + " - " + _("Wide"));
        this.gridIconsSizeCombo.append("Medium Rect", _("Medium") + " - " + _("Wide"));
        this.gridIconsSizeCombo.append("Large Rect", _("Large") + " - " + _("Wide"));
        this.gridIconsSizeCombo.set_active(this._settings.get_enum('menu-item-grid-icon-size'));
        this.gridIconsSizeCombo.connect('changed', (widget) => {
            this._settings.set_enum('menu-item-grid-icon-size', widget.get_active());
        });
        gridIconsSizeRow.add_suffix(this.gridIconsSizeCombo);
        iconsSizeFrame.add(gridIconsSizeRow);

        [this.menuItemIconSizeCombo, this.menuItemIconSizeRow] = this.createIconSizeRow(_("Categories &amp; Applications"), 'menu-item-icon-size');
        iconsSizeFrame.add(this.menuItemIconSizeRow);
        [this.buttonIconSizeCombo, this.buttonIconSizeRow] = this.createIconSizeRow(_("Buttons"), 'button-item-icon-size');
        iconsSizeFrame.add(this.buttonIconSizeRow);
        [this.quicklinksIconSizeCombo, this.quicklinksIconSizeRow] = this.createIconSizeRow(_("Quick Links"),'quicklinks-item-icon-size');
        iconsSizeFrame.add(this.quicklinksIconSizeRow);
        [this.miscIconSizeCombo, this.miscIconSizeRow] = this.createIconSizeRow(_("Misc"), 'misc-item-icon-size');
        iconsSizeFrame.add(this.miscIconSizeRow);

        this.append(iconsSizeFrame);

        let generalSettingsFrame = new Adw.PreferencesGroup({
            title: _('General Settings')
        });
        let menuLocationRow = new Adw.ActionRow({
            title: _('Override Menu Location')
        });
        let menuLocationCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        menuLocationCombo.append_text(_("Off"));
        menuLocationCombo.append_text(_("Top Centered"));
        menuLocationCombo.append_text(_("Bottom Centered"));
        menuLocationCombo.set_active(this._settings.get_enum('force-menu-location'));
        menuLocationCombo.connect('changed', (widget) => {
            this._settings.set_enum('force-menu-location', widget.get_active())
        });
        menuLocationRow.add_suffix(menuLocationCombo);
        generalSettingsFrame.add(menuLocationRow);
        this.append(generalSettingsFrame);

        let appDescriptionsRow = new Adw.ActionRow({
            title: _("Show Application Descriptions")
        });

        let appDescriptionsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER,
        });
        appDescriptionsSwitch.set_active(this.appDescriptions);
        appDescriptionsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('apps-show-extra-details', widget.get_active())
        });
        appDescriptionsRow.add_suffix(appDescriptionsSwitch);
        generalSettingsFrame.add(appDescriptionsRow);

        let categoryIconTypeRow = new Adw.ActionRow({
            title: _('Category Icon Type')
        });
        let categoryIconTypeCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        categoryIconTypeCombo.append_text(_("Full Color"));
        categoryIconTypeCombo.append_text(_("Symbolic"));
        categoryIconTypeCombo.set_active(this.categoryIconType);
        categoryIconTypeCombo.connect('changed', (widget) => {
            this._settings.set_enum('category-icon-type', widget.get_active());
        });
        categoryIconTypeRow.add_suffix(categoryIconTypeCombo);
        generalSettingsFrame.add(categoryIconTypeRow);

        let shortcutsIconTypeRow = new Adw.ActionRow({
            title: _('Shortcuts Icon Type')
        });

        let shortcutsIconTypeCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        shortcutsIconTypeCombo.append_text(_("Full Color"));
        shortcutsIconTypeCombo.append_text(_("Symbolic"));
        shortcutsIconTypeCombo.set_active(this.shortcutsIconType);
        shortcutsIconTypeCombo.connect('changed', (widget) => {
            this._settings.set_enum('shortcut-icon-type', widget.get_active());
        });
        shortcutsIconTypeRow.add_suffix(shortcutsIconTypeCombo);
        generalSettingsFrame.add(shortcutsIconTypeRow);

        let vertSeparatorRow = new Adw.ActionRow({
            title: _('Enable Vertical Separator')
        });
        let vertSeparatorSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        vertSeparatorSwitch.set_active(this.verticalSeparator);
        vertSeparatorSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('vert-separator', widget.get_active());
        });
        vertSeparatorRow.add_suffix(vertSeparatorSwitch);
        generalSettingsFrame.add(vertSeparatorRow);
    
        this.restoreDefaults = () => {
            this.heightValue = this._settings.get_default_value('menu-height').unpack();
            this.widthValue = this._settings.get_default_value('menu-width-adjustment').unpack();
            this.rightPanelWidth = this._settings.get_default_value('right-panel-width').unpack();
            this.menuWidth = this._settings.get_default_value('menu-width').unpack();
            this.verticalSeparator = this._settings.get_default_value('vert-separator').unpack();
            this.appDescriptions = this._settings.get_default_value('apps-show-extra-details').unpack();
            this.categoryIconType = 0;
            this.shortcutsIconType = 1;
            this.forcedMenuLocation = 0;
            heightSpinButton.set_value(this.heightValue);
            widthSpinButton.set_value(this.widthValue);
            menuWidthSpinButton.set_value(this.menuWidth);
            rightPanelWidthSpinButton.set_value(this.rightPanelWidth);
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            this.gridIconsSizeCombo.set_active(0);
            this.menuItemIconSizeCombo.set_active(0);
            this.buttonIconSizeCombo.set_active(0);
            this.quicklinksIconSizeCombo.set_active(0);
            this.miscIconSizeCombo.set_active(0);
            appDescriptionsSwitch.set_active(this.appDescriptions);
            menuLocationCombo.set_active(this.forcedMenuLocation);
            categoryIconTypeCombo.set_active(0);
            shortcutsIconTypeCombo.set_active(1);
        };
    }

    createIconSizeRow(title, setting){
        let iconsSizeRow = new Adw.ActionRow({
            title: _(title)
        });
        let iconSizeCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        iconSizeCombo.append("Default", _("Default"));
        iconSizeCombo.append("ExtraSmall", _("Extra Small"));
        iconSizeCombo.append("Small", _("Small"));
        iconSizeCombo.append("Medium", _("Medium"));
        iconSizeCombo.append("Large", _("Large"));
        iconSizeCombo.append("ExtraLarge", _("Extra Large"));
        iconSizeCombo.set_active(this._settings.get_enum(setting));
        iconSizeCombo.connect('changed', (widget) => {
            this._settings.set_enum(setting, widget.get_active());
        });
        iconsSizeRow.add_suffix(iconSizeCombo);
        return [iconSizeCombo, iconsSizeRow];
    }
});

var MenuSettingsFineTunePage = GObject.registerClass(
    class Arc_Menu_MenuSettingsFineTunePage extends Gtk.Box {
    _init(settings) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this._settings = settings;
        this.disableFadeEffect = this._settings.get_boolean('disable-scrollview-fade-effect');
        this.gapAdjustment = this._settings.get_int('gap-adjustment');
        this.removeMenuArrow = this._settings.get_boolean('remove-menu-arrow');
        this.disableSearchStyle = this._settings.get_boolean('disable-searchbox-border');
        this.alphabetizeAllPrograms = this._settings.get_boolean('alphabetize-all-programs')
        this.multiLinedLabels = this._settings.get_boolean('multi-lined-labels');
        this.disableTooltips = this._settings.get_boolean('disable-tooltips');
        this.subMenus = this._settings.get_boolean('enable-sub-menus');

        let searchStyleFrame = new Adw.PreferencesGroup();
        let searchStyleRow = new Adw.ActionRow({
            title: _("Disable Searchbox Border")
        });
        let searchStyleSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        searchStyleSwitch.set_active(this._settings.get_boolean('disable-searchbox-border'));
        searchStyleSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('disable-searchbox-border', widget.get_active());
        });
        searchStyleRow.add_suffix(searchStyleSwitch);
        searchStyleFrame.add(searchStyleRow);
        this.append(searchStyleFrame);

        let tweakStyleFrame = new Adw.PreferencesGroup();
        let tweakStyleRow = new Adw.ActionRow({
            title: _("Disable Menu Arrow")
        });
        let tweakStyleSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        tweakStyleSwitch.set_active(this._settings.get_boolean('remove-menu-arrow'));
        tweakStyleSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('remove-menu-arrow', widget.get_active());
        });
        tweakStyleRow.add_suffix(tweakStyleSwitch);
        tweakStyleFrame.add(tweakStyleRow);
        this.append(tweakStyleFrame);

        let fadeEffectFrame = new Adw.PreferencesGroup();
        let fadeEffectRow = new Adw.ActionRow({
            title: _("Disable ScrollView Fade Effects")
        });
        let fadeEffectSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        fadeEffectSwitch.set_active(this._settings.get_boolean('disable-scrollview-fade-effect'));
        fadeEffectSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('disable-scrollview-fade-effect', widget.get_active());
        });
        fadeEffectRow.add_suffix(fadeEffectSwitch);
        fadeEffectFrame.add(fadeEffectRow);
        this.append(fadeEffectFrame);

        let tooltipFrame = new Adw.PreferencesGroup();
        let tooltipRow = new Adw.ActionRow({
            title: _("Disable Tooltips")
        });
        let tooltipSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        tooltipSwitch.set_active(this.disableTooltips);
        tooltipSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('disable-tooltips', widget.get_active());
        });
        tooltipRow.add_suffix(tooltipSwitch);
        tooltipFrame.add(tooltipRow);
        this.append(tooltipFrame);

        let alphabetizeAllProgramsFrame = new Adw.PreferencesGroup();
        let alphabetizeAllProgramsRow = new Adw.ActionRow({
            title: _("Alphabetize 'All Programs' Category")
        });
        let alphabetizeAllProgramsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        alphabetizeAllProgramsSwitch.set_active(this._settings.get_boolean('alphabetize-all-programs'));
        alphabetizeAllProgramsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('alphabetize-all-programs', widget.get_active());
        });
        alphabetizeAllProgramsRow.add_suffix(alphabetizeAllProgramsSwitch);
        alphabetizeAllProgramsFrame.add(alphabetizeAllProgramsRow);
        this.append(alphabetizeAllProgramsFrame);

        let subMenusFrame = new Adw.PreferencesGroup();
        let subMenusRow = new Adw.ActionRow({
            title: _('Category Sub Menus')
        });;
        let subMenusSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        subMenusSwitch.set_active(this.subMenus);
        subMenusSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('enable-sub-menus', widget.get_active());
        });
        subMenusRow.add_suffix(subMenusSwitch);
        subMenusFrame.add(subMenusRow);
        this.append(subMenusFrame);

        let multiLinedLabelFrame = new Adw.PreferencesGroup();
        let multiLinedLabelRow = new Adw.ActionRow({
            title: _("Multi-Lined Labels")
        });
        let multiLinedLabelSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        multiLinedLabelSwitch.set_active(this._settings.get_boolean('multi-lined-labels'));
        multiLinedLabelSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('multi-lined-labels', widget.get_active());
        });
        let multiLinedLabelInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
        });
        multiLinedLabelInfoButton.connect('clicked', ()=> {
            let dialog = new PW.MessageDialog({
                text: _("Multi-Lined Labels"),
                secondaryText: _('Enable/Disable multi-lined labels on large application icon layouts.'),
                buttons: Gtk.ButtonsType.OK,
                transient_for: this.get_root()
            });
            dialog.connect ('response', () => dialog.destroy());
            dialog.show();
        });
        multiLinedLabelRow.add_suffix(multiLinedLabelSwitch);
        multiLinedLabelRow.add_suffix(multiLinedLabelInfoButton);
        multiLinedLabelFrame.add(multiLinedLabelRow);
        this.append(multiLinedLabelFrame);

        let gapAdjustmentFrame = new Adw.PreferencesGroup();
        let gapAdjustmentRow = new Adw.ActionRow({
            title: _('Gap Adjustment')
        });
        let gapAdjustmentScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: -1, upper: 20, step_increment: 1, page_increment: 1, page_size: 0
            }),
            digits: 0,round_digits: 0,hexpand: true,
            value_pos: Gtk.PositionType.RIGHT,
            draw_value: true,
            valign: Gtk.Align.CENTER 
        });
        gapAdjustmentScale.set_value(this.gapAdjustment);
        gapAdjustmentScale.connect('value-changed', (widget) => {
            this._settings.set_int('gap-adjustment', widget.get_value());
        });

        let gapAdjustmentInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
        });
        gapAdjustmentInfoButton.connect('clicked', ()=> {
            let dialog = new PW.MessageDialog({
                text: _("Adjust the gap between the ArcMenu button and the menu."),
                buttons: Gtk.ButtonsType.OK,
                transient_for: this.get_root()
            });
            dialog.connect ('response', ()=> dialog.destroy());
            dialog.show();
        });
        gapAdjustmentRow.add_suffix(gapAdjustmentScale);
        gapAdjustmentRow.add_suffix(gapAdjustmentInfoButton);
        gapAdjustmentFrame.add(gapAdjustmentRow);
        this.append(gapAdjustmentFrame);

        this.restoreDefaults = ()=> {
            this.gapAdjustment = this._settings.get_default_value('gap-adjustment').unpack();
            this.removeMenuArrow = this._settings.get_default_value('remove-menu-arrow').unpack();
            this.disableSearchStyle = this._settings.get_default_value('disable-searchbox-border').unpack();
            this.alphabetizeAllPrograms = this._settings.get_default_value('alphabetize-all-programs').unpack();
            this.multiLinedLabels = this._settings.get_default_value('multi-lined-labels').unpack();
            this.subMenus = this._settings.get_default_value('enable-sub-menus').unpack();
            this.disableTooltips = this._settings.get_default_value('disable-tooltips').unpack();
            this.disableFadeEffect = this._settings.get_default_value('disable-scrollview-fade-effect').unpack();
            alphabetizeAllProgramsSwitch.set_active(this.alphabetizeAllPrograms);
            gapAdjustmentScale.set_value(this.gapAdjustment);
            searchStyleSwitch.set_active(this.disableSearchStyle);
            tweakStyleSwitch.set_active(this.removeMenuArrow);
            multiLinedLabelSwitch.set_active(this.multiLinedLabels);
            tooltipSwitch.set_active(this.disableTooltips);
            subMenusSwitch.set_active(this.subMenus);
            fadeEffectSwitch.set_active(this.disableFadeEffect);
        };
    }
});

var MenuSettingsNewAppsPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsNewAppsPage extends Gtk.Box {
    _init(settings) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this._settings = settings;
        this.disableRecentApps = this._settings.get_boolean('disable-recently-installed-apps');
        this.indicatorColor = this._settings.get_string('indicator-color');
        this.indicatorTextColor = this._settings.get_string('indicator-text-color');

        let recentAppsFrame = new Adw.PreferencesGroup();
        let recentAppsRow = new Adw.ActionRow({
            title: _("Disable New Apps Tracker")
        });
        let recentAppsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        recentAppsSwitch.connect('notify::active', (widget) => {
            if(widget.get_active()){
                appIndicatorColorFrame.hide();
                clearRecentAppsFrame.hide();
            }
            else{
                appIndicatorColorFrame.show();
                clearRecentAppsFrame.show();
            }
            this._settings.set_boolean('disable-recently-installed-apps', widget.get_active());
        });
        recentAppsRow.add_suffix(recentAppsSwitch);
        recentAppsFrame.add(recentAppsRow);
        this.append(recentAppsFrame);

        let appIndicatorColorFrame = new Adw.PreferencesGroup({
            title: _("Customize New Apps Indicator")
        });

        let appIndicatorColorRow = new Adw.ActionRow({
            title: _('Category Indicator Color')
        });
        let appIndicatorColorChooser = new Gtk.ColorButton({
            use_alpha: true,
            valign: Gtk.Align.CENTER,
        });
        let color = new Gdk.RGBA();
        color.parse(this.indicatorColor);
        appIndicatorColorChooser.set_rgba(color);
        appIndicatorColorChooser.connect('color-set', (widget) => {
            this._settings.set_string('indicator-color', widget.get_rgba().to_string());
            this._settings.set_boolean('reload-theme', true);
        });
        appIndicatorColorRow.add_suffix(appIndicatorColorChooser);
        appIndicatorColorFrame.add(appIndicatorColorRow);

        let appIndicatorTextColorRow = new Adw.ActionRow({
            title: _('App Indicator Label Color')
        });

        let appIndicatorTextColorChooser = new Gtk.ColorButton({
            use_alpha: true,
            valign: Gtk.Align.CENTER,
        });
        color = new Gdk.RGBA();
        color.parse(this.indicatorTextColor);
        appIndicatorTextColorChooser.set_rgba(color);
        appIndicatorTextColorChooser.connect('color-set', (widget) => {
            this._settings.set_string('indicator-text-color', widget.get_rgba().to_string());
            this._settings.set_boolean('reload-theme', true);
        });
        appIndicatorTextColorRow.add_suffix(appIndicatorTextColorChooser);
        appIndicatorColorFrame.add(appIndicatorTextColorRow);
        this.append(appIndicatorColorFrame);

        let clearRecentAppsFrame = new Adw.PreferencesGroup();
        let clearRecentAppsRow = new Adw.ActionRow({
            title: _("Clear Apps Marked 'New'")
        });
        let clearRecentAppsButton = new Gtk.Button({
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            label: _("Clear All"),
        });
        let sensitive = this._settings.get_strv('recently-installed-apps').length > 0;
        clearRecentAppsButton.set_sensitive(sensitive);
        clearRecentAppsButton.connect('clicked', (widget) => {
            clearRecentAppsButton.set_sensitive(false);
            this._settings.reset('recently-installed-apps');
        });
        clearRecentAppsRow.add_suffix(clearRecentAppsButton);
        clearRecentAppsFrame.add(clearRecentAppsRow);
        this.append(clearRecentAppsFrame);

        this.restoreDefaults = ()=> {
            this.disableRecentApps = this._settings.get_default_value('disable-recently-installed-apps').unpack();
            this.indicatorColor = this._settings.get_default_value('indicator-color').unpack();
            this.indicatorTextColor = this._settings.get_default_value('indicator-text-color').unpack();
            recentAppsSwitch.set_active(this.disableRecentApps);
            let color = new Gdk.RGBA();
            color.parse(this.indicatorColor);
            appIndicatorColorChooser.set_rgba(color);
            color.parse(this.indicatorTextColor);
            appIndicatorTextColorChooser.set_rgba(color);
        };
        recentAppsSwitch.set_active(this._settings.get_boolean('disable-recently-installed-apps'));
    }
});

var MenuSettingsSearchOptionsPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsSearchOptionsPage extends Gtk.Box {
    _init(settings) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this._settings = settings;
        this.searchResultsDetails = this._settings.get_boolean('show-search-result-details');
        this.openWindowsSearchProvider = this._settings.get_boolean('search-provider-open-windows');
        this.recentFilesSearchProvider = this._settings.get_boolean('search-provider-recent-files');
        this.highlightSearchResultTerms = this._settings.get_boolean('highlight-search-result-terms');
        this.maxSearchResults = this._settings.get_int('max-search-results');

        let searchProvidersFrame = new Adw.PreferencesGroup({
            title: _("Search Providers")
        });
        let openWindowsRow = new Adw.ActionRow({
            title: _("Search for open windows across all workspaces")
        });

        let openWindowsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        openWindowsSwitch.set_active(this.openWindowsSearchProvider);
        openWindowsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('search-provider-open-windows', widget.get_active());
        });
        openWindowsRow.add_suffix(openWindowsSwitch);
        searchProvidersFrame.add(openWindowsRow);

        let recentFilesRow = new Adw.ActionRow({
            title: _("Search for recent files")
        });
        let recentFilesSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        recentFilesSwitch.set_active(this.recentFilesSearchProvider);
        recentFilesSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('search-provider-recent-files', widget.get_active());
        });
        recentFilesRow.add_suffix(recentFilesSwitch);
        searchProvidersFrame.add(recentFilesRow);
        this.append(searchProvidersFrame);

        let searchOptionsFrame = new Adw.PreferencesGroup({
            title: _("Search Options")
        });
        let descriptionsRow = new Adw.ActionRow({
            title: _("Show descriptions of search results")
        });
        let descriptionsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        descriptionsSwitch.set_active(this.searchResultsDetails);
        descriptionsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-search-result-details', widget.get_active());
        });
        descriptionsRow.add_suffix(descriptionsSwitch);
        searchOptionsFrame.add(descriptionsRow);

        let highlightSearchResultRow = new Adw.ActionRow({
            title: _("Highlight search result terms")
        });
        let highlightSearchResultSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        highlightSearchResultSwitch.set_active(this.highlightSearchResultTerms);
        highlightSearchResultSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('highlight-search-result-terms', widget.get_active());
        });
        highlightSearchResultRow.add_suffix(highlightSearchResultSwitch);
        searchOptionsFrame.add(highlightSearchResultRow);

        let maxSearchResultsScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 2,
                upper: 10,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        let maxSearchResultsRow = new Adw.ActionRow({
            title: _('Max Search Results'),
            activatable_widget: maxSearchResultsScale
        });
        maxSearchResultsScale.set_value(this.maxSearchResults);
        maxSearchResultsScale.connect('value-changed', (widget) => {
            this._settings.set_int('max-search-results', widget.get_value());
        });
        maxSearchResultsRow.add_suffix(maxSearchResultsScale);
        searchOptionsFrame.add(maxSearchResultsRow);
        this.append(searchOptionsFrame);

        this.restoreDefaults = () => {
            this.searchResultsDetails = this._settings.get_default_value('show-search-result-details').unpack();
            this.openWindowsSearchProvider = this._settings.get_default_value('search-provider-open-windows').unpack();
            this.recentFilesSearchProvider = this._settings.get_default_value('search-provider-recent-files').unpack();
            this.highlightSearchResultTerms = this._settings.get_default_value('highlight-search-result-terms').unpack();
            this.maxSearchResults = this._settings.get_default_value('max-search-results').unpack();
            descriptionsSwitch.set_active(this.searchResultsDetails);
            openWindowsSwitch.set_active(this.openWindowsSearchProvider);
            highlightSearchResultSwitch.set_active(this.highlightSearchResultTerms);
            maxSearchResultsScale.set_value(this.maxSearchResults);
        };
    }
});

var MenuSettingsListOtherPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsListOtherPage extends Gtk.Box {
    _init(settings, listType) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this.frameRows = [];
        this.listType = listType;

        if(this.listType === Constants.MenuSettingsListType.POWER_OPTIONS)
            this.settingString = 'power-options';
        else if(this.listType === Constants.MenuSettingsListType.EXTRA_CATEGORIES)
            this.settingString = 'extra-categories';
        else if(this.listType === Constants.MenuSettingsListType.QUICK_LINKS)
            this.settingString = 'arcmenu-extra-categories-links';

        this._settings = settings;
        this.categoriesFrame = new Adw.PreferencesGroup();

        this._createFrame(this._settings.get_value(this.settingString).deep_unpack());
        this.append(this.categoriesFrame);

        this.restoreDefaults = () => {
            this.frameRows.forEach(child => {
                this.categoriesFrame.remove(child);
            });
            this.frameRows = [];
    
            this._createFrame(this._settings.get_default_value(this.settingString).deep_unpack());
            this.saveSettings();
        };
    }

    saveSettings(){
        let array = [];
        this.frameRows.sort((a, b) => {
            return a.get_index() > b.get_index();
        })
        this.frameRows.forEach(child => {
            array.push([child._enum, child._shouldShow]);
        });
        
        this._settings.set_value(this.settingString, new GLib.Variant('a(ib)', array));
    }

    _createFrame(extraCategories){
        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let name, iconString;
            if(this.listType === Constants.MenuSettingsListType.POWER_OPTIONS){
                name = Constants.PowerOptions[categoryEnum].NAME;
                iconString = Constants.PowerOptions[categoryEnum].ICON;
            }
            else {
                name = Constants.Categories[categoryEnum].NAME;
                iconString = Constants.Categories[categoryEnum].ICON
            }

            let frameRow = new PW.FrameBoxDragRow();
            frameRow._enum = extraCategories[i][0];
            frameRow._shouldShow = extraCategories[i][1];
            frameRow._name = _(name);
            frameRow._gicon = Gio.icon_new_for_string(iconString);
            frameRow.saveButton = this.saveButton;
            frameRow.resetButton = this.resetButton;
            frameRow.hasSwitch = true;
            frameRow.switchActive = frameRow._shouldShow;

            let applicationIcon = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            frameRow.add_prefix(applicationIcon);
            frameRow.add_prefix(dragImage);
            frameRow.title = _(name);

            let buttonBox = new PW.EditEntriesBox({
                frameRow: frameRow,
                frame: this.categoriesFrame,
                buttons: [this.saveButton, this.resetButton],
            });

            let modifyButton = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                margin_start: 10,
            });

            modifyButton.set_active(frameRow._shouldShow);
            modifyButton.connect('notify::active', ()=> {
                frameRow._shouldShow = modifyButton.get_active();
                this.saveSettings();
            });
            buttonBox.connect("row-changed", () =>{
                this.saveSettings();
            });
            frameRow.connect("drag-drop-done", () => {
                this.saveSettings();
            });
            buttonBox.insert_column(0);
            buttonBox.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
            buttonBox.insert_column(0);
            buttonBox.attach(modifyButton, 0, 0, 1, 1);

            frameRow.add_suffix(buttonBox);
            this.frameRows.push(frameRow);
            this.categoriesFrame.add(frameRow);
        }
    }
});

var ColorThemeDialogWindow = GObject.registerClass(
    class Arc_Menu_ColorThemeDialogWindow extends PW.DialogWindow {
        _init(settings, parent, themeName="") {
            this._settings = settings;
            this.addResponse = false;
            this.themeName = themeName;
            super._init(_('Color Theme Name'), parent);
        }

        _createLayout(vbox) {
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            nameFrameRow.add(nameFrameLabel);
            this.nameEntry = new Gtk.Entry();
            this.nameEntry.set_width_chars(35);

            nameFrameRow.add(this.nameEntry);
            this.nameEntry.grab_focus();
            if(this.themeName!=""){
                this.nameEntry.set_text(this.themeName);
            }
            this.nameEntry.connect('changed',()=>{
                if(this.nameEntry.get_text().length > 0)
                    saveButton.set_sensitive(true);
                else
                    saveButton.set_sensitive(false);
            });

            vbox.append(nameFrameRow);
            let saveButton = new Gtk.Button({
                label: _("Save Theme"),
                halign: Gtk.Align.END
            });
            saveButton.set_sensitive(false);
            saveButton.connect('clicked', ()=> {
                this.themeName = this.nameEntry.get_text();
                this.addResponse=true;
                this.response(-10);
            });
            vbox.append(saveButton);
        }
});

var ExportColorThemeDialogWindow = GObject.registerClass(
    class Arc_Menu_ExportColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent, themes=null) {
            this._settings = settings;
            this._themes = themes;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init(this._themes ? _('Select Themes to Import'): _('Select Themes to Export'), parent);
        }

        _createLayout(vbox) {
            vbox.spacing = 0;
            this.checkButtonArray = [];
            this.shouldToggle =true;
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();

            let themesListButton = new Gtk.Button({
                label: this._themes ?_("Import"): _("Export"),
            });

            themesListButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
	        themesListButton.set_halign(Gtk.Align.END);

            themesListScrollWindow.set_child(this.mainFrame);
            this.checkAllButton = new Gtk.CheckButton({
                margin_end: 23
            });

            this.checkAllButton.set_halign(Gtk.Align.END);
            this.checkAllButton.set_active(true);
            this.checkAllButton.connect('toggled', () => {
                let isActive = this.checkAllButton.get_active();
                if(this.shouldToggle){
                    for(let i = 0; i< this.checkButtonArray.length; i++){
                        this.checkButtonArray[i].set_active(isActive);
                    }
                }
            });
            let checkAllRow = new PW.FrameBoxRow();
            let checkAllLabel = new Gtk.Label({
                use_markup: false,
                xalign: 0,
                hexpand: true,
                label: _("Select All"),
                halign: Gtk.Align.END
            });
            checkAllRow.add(checkAllLabel);
            checkAllRow.add(this.checkAllButton);
            vbox.append(checkAllRow);
            vbox.append(themesListScrollWindow);
            vbox.append(new PW.FrameBoxRow());
            vbox.append(themesListButton);

            this.color_themes = this._themes ? this._themes : this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++) {
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();

                let themeBox = new Gtk.Box();

                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    label: theme[0],
                    hexpand: true
                });

                let xpm = Utils.createXpmImage(theme[1], theme[2], theme[4], theme[5]);
                let presetPreview = new Gtk.Image({
                    hexpand: false,
                    margin_end: 5,
                    pixel_size: 42
                });
                presetPreview.set_from_pixbuf(GdkPixbuf.Pixbuf.new_from_xpm_data(xpm));
                themeBox.append(presetPreview);
                themeBox.append(frameLabel);
                frameRow.add(themeBox);

                let checkButton = new Gtk.CheckButton({
                    margin_end: 20
                });
                checkButton.connect('toggled', () => {
                    if(checkButton.get_active()){
                        this.selectedThemes.push(theme);
                    }
                    else{
                        this.shouldToggle = false;
                        this.checkAllButton.set_active(false);
                        this.shouldToggle = true;
                        let index= this.selectedThemes.indexOf(theme);
                        this.selectedThemes.splice(index,1);
                    }
                });
                this.checkButtonArray.push(checkButton);
                frameRow.add(checkButton);
                this.mainFrame.add(frameRow);
                checkButton.set_active(true);
            }
        }
});

var ManageColorThemeDialogWindow = GObject.registerClass(
    class Arc_Menu_ManageColorThemeDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init( _('Manage Presets'), parent);
        }

        _createLayout(vbox) {
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();
            let buttonRow = new PW.FrameBoxRow();

            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true
            });
            applyButton.set_sensitive(false);
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
	        applyButton.set_halign(Gtk.Align.END);

            themesListScrollWindow.set_child(this.mainFrame);
            vbox.append(themesListScrollWindow);
            buttonRow.add(applyButton);
            vbox.append(buttonRow);

            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++) {
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();
                let themeBox = new Gtk.Box();

                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    label: theme[0],
                    hexpand: true
                });
                let xpm = Utils.createXpmImage(theme[1], theme[2], theme[4], theme[5]);
                let presetPreview = new Gtk.Image({
                    hexpand: false,
                    margin_end: 5,
                    pixel_size: 42
                });
                presetPreview.set_from_pixbuf(GdkPixbuf.Pixbuf.new_from_xpm_data(xpm));

                themeBox.append(presetPreview);
                themeBox.append(frameLabel);
                frameRow.add(themeBox);

                let buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow,
                    frame: this.mainFrame,
                    buttons: [applyButton],
                    modifyButton: true,
                    deleteButton: true
                });

                buttonBox.connect('modify', () => {
                    let dialog = new ColorThemeDialogWindow(this._settings, this, theme[0]);
                    dialog.show();
                    dialog.connect('response', (_w, response) => {
                        if(response === Gtk.ResponseType.APPLY) {
                            let index = frameRow.get_index();
                            let array = [dialog.themeName, theme[1], theme[2], theme[3], theme[4], theme[5],
                                        theme[6], theme[7], theme[8], theme[9], theme[10], theme[11], theme[12]];
                            this.color_themes.splice(index,1,array);
                            theme = array;
                            frameLabel.label = dialog.themeName;
                            dialog.destroy();
                        }
                    });
                    applyButton.set_sensitive(true);
                });
                buttonBox.connect('move-up', () => {
                    let index = frameRow.get_index();
                    if(index > 0){
                        this.color_themes.splice(index, 1);
                        this.color_themes.splice(index - 1, 0, theme);
                    }
                });

                buttonBox.connect('move-down', () => {
                    let index = frameRow.get_index();
                    if(index + 1 < this.mainFrame.count){
                        this.color_themes.splice(index, 1);
                        this.color_themes.splice(index + 1, 0, theme);
                    }
                });

                buttonBox.connect('delete', () => {
                    let index = frameRow.get_index();
                    this.color_themes.splice(index, 1);
                });

                frameRow.add(buttonBox);
                this.mainFrame.add(frameRow);
            }
        }
});

var MiscPage = GObject.registerClass(
    class Arc_Menu_MiscPage extends Adw.PreferencesPage {
        _init(settings, parentBox) {
            super._init({
                title: _('Misc'),
                icon_name: 'misc-symbolic'
            });
            this._settings = settings;

            let importFrame = new Adw.PreferencesGroup({
                title: _('Export or Import Settings')
            });
            let importRow = new Adw.ActionRow({
                title: _("All ArcMenu Settings")
            });
            let settingsImportInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            settingsImportInfoButton.connect('clicked', ()=> {
                let dialog = new PW.MessageDialog({
                    text: _("Export or Import All ArcMenu Settings"),
                    secondaryText: _('Importing settings from file may replace ALL saved settings.\nThis includes all saved pinned apps.'),
                    buttons: Gtk.ButtonsType.OK,
                    transient_for: this.get_root()
                });
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show();
            });

            let importButton = new Gtk.Button({
                label: _("Import"),
                valign: Gtk.Align.CENTER
            });
            importButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import settings'),
                    { action: Gtk.FileChooserAction.OPEN },
                    "_Open",
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ success_, pid, stdin, stdout, stderr] =
                            GLib.spawn_async_with_pipes(
                                null,
                                ['dconf', 'load', SCHEMA_PATH],
                                null,
                                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                                null
                            );

                        stdin = new Gio.UnixOutputStream({ fd: stdin, close_fd: true });
                        GLib.close(stdout);
                        GLib.close(stderr);

                        stdin.splice(settingsFile.read(null), Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);
                    }
                );
            });
            let exportButton = new Gtk.Button({
                label: _("Export"),
                valign: Gtk.Align.CENTER
            });
            exportButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Export settings'),
                    { action: Gtk.FileChooserAction.SAVE},
                    "_Save",
                    (filename) => {
                        let file = Gio.file_new_for_path(filename);
                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                        out.write_all(GLib.spawn_command_line_sync('dconf dump ' + SCHEMA_PATH)[1], null);
                        out.close(null);
                    }
                );
            });
            importRow.add_suffix(importButton);
            importRow.add_suffix(exportButton);
            importRow.add_suffix(settingsImportInfoButton);
            importFrame.add(importRow);
            this.add(importFrame);

            let importColorPresetFrame = new Adw.PreferencesGroup();
            let importColorPresetRow = new Adw.ActionRow({
                title: _("Menu Theme Presets")
            });

            let colorThemesImportInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            colorThemesImportInfoButton.connect('clicked', ()=> {
                let dialog = new PW.MessageDialog({
                    text: _("Export or Import Menu Theme Presets"),
                    secondaryText: _('Menu theme presets are located in the "Menu Theme" section'),
                    buttons: Gtk.ButtonsType.OK,
                    transient_for: this.get_root()
                });
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show();
            });

            let importColorPresetButton = new Gtk.Button({
                label: _("Import"),
                valign: Gtk.Align.CENTER
            });
            importColorPresetButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import Theme Preset'),
                    { action: Gtk.FileChooserAction.OPEN },
                    "_Open",
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ success, content, etags] = settingsFile.load_contents(null);
                        let string = ByteArray.toString(content);
                        let themes = string.split("\n")
                        themes.pop(); //remove last blank array
                        this.color_themes = [];
                        for(let i = 0; i < themes.length; i++){
                            let array = themes[i].split('//')
                            array.pop();
                            this.color_themes.push(array);
                        }
                        let dialog = new ExportColorThemeDialogWindow(this._settings, this, this.color_themes);
                        dialog.show();
                        dialog.connect('response', (_w, response) => {
                            if(response === Gtk.ResponseType.APPLY){
                                let selectedThemes = dialog.selectedThemes;
                                this.color_themes = this._settings.get_value('color-themes').deep_unpack();
                                for(let i = 0; i < selectedThemes.length; i++)
                                    this.color_themes.push(selectedThemes[i]);
                                this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                                dialog.destroy();
                            }
                        });
                    }
                );
            });
            let exportColorPresetButton = new Gtk.Button({
                label: _("Export"),
                valign: Gtk.Align.CENTER
            });
            exportColorPresetButton.connect('clicked', ()=> {
                let dialog = new ExportColorThemeDialogWindow(this._settings, this);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY){
                       this.selectedThemes = dialog.selectedThemes;
                       this._showFileChooser(
                            _('Export Theme Preset'),
                                { action: Gtk.FileChooserAction.SAVE },
                                    "_Save",
                                    (filename) => {
                                        let file = Gio.file_new_for_path(filename);
                                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                                        for(let i = 0; i<this.selectedThemes.length; i++){
                                            for(let x = 0; x<this.selectedThemes[i].length;x++){
                                                out.write_all((this.selectedThemes[i][x]).toString()+"//", null);
                                            }
                                            out.write_all("\n", null);
                                        }
                                        out.close(null);
                                    }
                        );
                        dialog.destroy();
                    }
                });
            });
            importColorPresetRow.add_suffix(importColorPresetButton);
            importColorPresetRow.add_suffix(exportColorPresetButton);
            importColorPresetRow.add_suffix(colorThemesImportInfoButton);
            importColorPresetFrame.add(importColorPresetRow);
            this.add(importColorPresetFrame);

            let settingsSizeFrame = new Adw.PreferencesGroup({
                title: _('ArcMenu Settings Window Size')
            });
            let settingsWidthRow = new Adw.ActionRow({
                title: _('Window Width')
            });
            let settingsWidthScale = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 850, upper: 1800, step_increment: 1, page_increment: 1, page_size: 0,
                }),
                climb_rate: 1,
                digits: 0,
                numeric: true,
                valign: Gtk.Align.CENTER
            });
            settingsWidthScale.set_value(this._settings.get_int("settings-width"));
            settingsWidthScale.connect('value-changed', (widget) => {
                this._settings.set_int("settings-width", widget.get_value());
            });
            settingsWidthRow.add_suffix(settingsWidthScale);
            settingsSizeFrame.add(settingsWidthRow);

            let settingsHeightRow = new Adw.ActionRow({
                title: _('Window Height')
            });
            let settingsHeightScale = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 300, upper: 1600, step_increment: 1, page_increment: 1, page_size: 0,
                }),
                climb_rate: 1,
                digits: 0,
                numeric: true,
                valign: Gtk.Align.CENTER
            });
            settingsHeightScale.set_value(this._settings.get_int("settings-height"));
            settingsHeightScale.connect('value-changed', (widget) => {
                this._settings.set_int("settings-height", widget.get_value());
            });
            settingsHeightRow.add_suffix(settingsHeightScale);
            settingsSizeFrame.add(settingsHeightRow);

            this.add(settingsSizeFrame);

            let buttonGroup = new Adw.PreferencesGroup({
                title: _("Reset all ArcMenu Settings")
            });
            let resetSettingsButton = new Gtk.Button({
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER,
                hexpand: false,
                label: _("Reset all Settings"),
            });
            let context = resetSettingsButton.get_style_context();
            context.add_class('suggested-action');
            resetSettingsButton.connect('clicked', (widget) => {
                let dialog = new Gtk.MessageDialog({
                    text: "<b>" + _("Restore Default Settings?") + '</b>\n' + _("All ArcMenu settings will be reset to the default value."),
                    use_markup: true,
                    buttons: Gtk.ButtonsType.YES_NO,
                    message_type: Gtk.MessageType.WARNING,
                    transient_for: this.get_root(),
                    modal: true
                });
                dialog.connect('response', (widget, response) => {
                    if(response == Gtk.ResponseType.YES){
                        GLib.spawn_command_line_sync('dconf reset -f /org/gnome/shell/extensions/arcmenu/');
                        //TODO -- FIX THIS
                        //parentBox.populateSettingsFrameStack();
                    }
                    dialog.destroy();
                });
                dialog.show();
            });
            buttonGroup.add(resetSettingsButton);
            this.add(buttonGroup);
        }
        _showFileChooser(title, params, acceptBtn, acceptHandler) {
            let dialog = new Gtk.FileChooserDialog({
                title: _(title),
                transient_for: this.get_root(),
                modal: true,
                action: params.action,
            });
            dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
            dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);

            dialog.connect("response", (self, response) => {
                if(response === Gtk.ResponseType.ACCEPT){
                    try {
                        acceptHandler(dialog.get_file().get_path());
                    } catch(e) {
                        log('error from ArcMenu filechooser: ' + e);
                    }
                }
                dialog.destroy();
            });

            dialog.show();
        }
});

var AboutPage = GObject.registerClass(
    class Arc_Menu_AboutPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: _("About"),
                icon_name: 'info-circle-symbolic',
            });
            this._settings = settings;

            //ArcMenu Logo and project description-------------------------------------
            let arcMenuLogoGroup = new Adw.PreferencesGroup();
            let arcMenuImage = new Gtk.Image({
                margin_bottom: 5,
                icon_name: 'arc-menu-logo',
                pixel_size: 100,
            });
            let arcMenuImageBox = new Gtk.Box( {
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 10,
                margin_bottom: 10,
                hexpand: false,
                vexpand: false
            });
            arcMenuImageBox.append(arcMenuImage);

            let arcMenuLabel = new Gtk.Label({
                label: '<span size="large"><b>' + _('ArcMenu') + '</b></span>',
                use_markup: true,
                vexpand: true,
                valign: Gtk.Align.FILL
            });

            let projectDescriptionLabel = new Gtk.Label({
                label: _('Application Menu Extension for GNOME'),
                hexpand: false,
                vexpand: false,
                margin_bottom: 5
            });
            arcMenuImageBox.append(arcMenuLabel);
            arcMenuImageBox.append(projectDescriptionLabel);
            arcMenuLogoGroup.add(arcMenuImageBox);

            this.add(arcMenuLogoGroup);
            //-----------------------------------------------------------------------

            //Extension/OS Info Group------------------------------------------------
            let extensionInfoGroup = new Adw.PreferencesGroup();
            let arcMenuVersionRow = new Adw.ActionRow({
                title: _("ArcMenu Version"),
            });
            let releaseVersion;
            if(Me.metadata.version)
                releaseVersion = Me.metadata.version;
            else
                releaseVersion = 'unknown';
            arcMenuVersionRow.add_suffix(new Gtk.Label({ 
                label: releaseVersion + ''
            }));
            extensionInfoGroup.add(arcMenuVersionRow);

            let commitRow = new Adw.ActionRow({
                title: _('Git Commit')
            });
            let commitVersion;
            if(Me.metadata.commit)
                commitVersion = Me.metadata.commit;
            commitRow.add_suffix(new Gtk.Label({ 
                label: commitVersion ? commitVersion : '',
            }));
            if(commitVersion){
                extensionInfoGroup.add(commitRow);
            }

            let gnomeVersionRow = new Adw.ActionRow({
                title: _('GNOME Version'),
            });
            gnomeVersionRow.add_suffix(new Gtk.Label({ 
                label: imports.misc.config.PACKAGE_VERSION + '',
            }));
            extensionInfoGroup.add(gnomeVersionRow);

            let osRow = new Adw.ActionRow({
                title: _('OS'),
            });
            let osInfoText;
            let name = GLib.get_os_info("NAME");
            let prettyName = GLib.get_os_info("PRETTY_NAME");
            if(prettyName)
                osInfoText = prettyName;
            else
                osInfoText = name;
            let versionID = GLib.get_os_info("VERSION_ID");
            if(versionID)
                osInfoText += "; Version ID: " + versionID;
            let buildID = GLib.get_os_info("BUILD_ID");
            if(buildID)
                osInfoText += "; " + "Build ID: " +buildID;
            osRow.add_suffix(new Gtk.Label({ 
                label: osInfoText,
            }));
            extensionInfoGroup.add(osRow);

            let sessionTypeRow = new Adw.ActionRow({
                title: _('Session Type'),
            });
            let windowingLabel;
            if(Me.metadata.isWayland)
                windowingLabel = "Wayland";
            else
                windowingLabel = "X11";
            sessionTypeRow.add_suffix(new Gtk.Label({ 
                label: windowingLabel,
            }));
            extensionInfoGroup.add(sessionTypeRow);

            this.add(extensionInfoGroup);
            //-----------------------------------------------------------------------

            let gnuSoftwareGroup = new Adw.PreferencesGroup();
            let gnuSofwareLabel = new Gtk.Label({
                label: _(Constants.GNU_SOFTWARE),
                use_markup: true,
                justify: Gtk.Justification.CENTER
            });
            let gnuSofwareLabelBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                valign: Gtk.Align.END,
                vexpand: true,
                margin_top: 5,
                margin_bottom: 10
            });
            gnuSofwareLabelBox.append(gnuSofwareLabel);
            gnuSoftwareGroup.add(gnuSofwareLabelBox);
            this.add(gnuSoftwareGroup);

            let linksGroup = new Adw.PreferencesGroup();
            let linksBox = new Gtk.Box({
                hexpand: false,
                vexpand: false,
                valign: Gtk.Align.END,
                halign: Gtk.Align.CENTER,
                margin_top: 0,
                margin_bottom: 0,
                margin_start: 0,
                margin_end: 0,
                spacing: 0,
            });

            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/icons/prefs_icons/donate-icon.svg', 150, 50);
            let donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
            let donateLinkButton = new Gtk.LinkButton({
                child: donateImage,
                uri: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=53CWA7NR743WC&item_name=Donate+to+support+my+work&currency_code=USD&source=url',
            });

            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/icons/prefs_icons/gitlab-icon.svg', 150, 50);
            let gitlabImage = Gtk.Picture.new_for_pixbuf(pixbuf);
            let projectUrl = Me.metadata.url;
            let projectLinkButton = new Gtk.LinkButton({
                child: gitlabImage,
                uri: projectUrl,
            });

            linksBox.append(projectLinkButton);
            linksBox.append(donateLinkButton);
            linksGroup.add(linksBox);
            this.add(linksGroup);
        }
});

var BuildMenuSettingsPages = GObject.registerClass(
class Arc_Menu_BuildMenuSettingsPages extends Adw.PreferencesPage {
    _init() {
        super._init({
            title: _('Customize'),
            icon_name: 'menu-settings-symbolic'
        });
        this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
        this.mainGroup = new Adw.PreferencesGroup();
        this.add(this.mainGroup);

        this.settingsFrameStack = new Gtk.Stack({
            vhomogeneous: false,
            transition_type: Gtk.StackTransitionType.CROSSFADE
        });

        this.headerLabel = new Gtk.Label({
            label: "<b>" + _("Menu Settings") + "</b>",
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            hexpand: true,
            halign: Gtk.Align.CENTER
        });

        this.menuSettingsStackListBox = new PW.StackListBox(this);
        let context = this.menuSettingsStackListBox.get_style_context();
        context.add_class('navigation-sidebar');
        context.add_class('background');
        this.menuSettingsStackListBox.addRow("MenuSettingsGeneral", _("Menu Settings"), 'menu-settings-symbolic');
        this.menuSettingsStackListBox.addRow("ButtonSettings", _("Button Settings"), 'arc-menu-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsPinnedApps", _("Pinned Apps"), 'pinned-apps-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsShortcutDirectories", _("Directory Shortcuts"), 'folder-documents-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsShortcutApplications", _("Application Shortcuts"), 'preferences-desktop-apps-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsPowerOptions", _("Power Options"), 'gnome-power-manager-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsSearchOptions", _("Search Options"), 'preferences-system-search-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsCategories", _("Extra Categories"), 'categories-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsNewApps", _("New Apps Tracker"), 'preferences-system-notifications-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsFineTune", _("Fine-Tune"), 'fine-tune-symbolic');
        this.menuSettingsStackListBox.setSeparatorIndices([2, 5, 9]);

        this.populateSettingsFrameStack();
        this.menuSettingsStackListBox.selectFirstRow();
        let flap = new Adw.Flap({
            content: this.settingsFrameStack,
            flap: this.menuSettingsStackListBox,
            separator: Gtk.Separator.new(Gtk.Orientation.VERTICAL),
            fold_policy: Adw.FlapFoldPolicy.ALWAYS
        })
        let button = new Gtk.ToggleButton({
            icon_name: 'sidebar-show',
            hexpand: false,
            halign: Gtk.Align.START
        })
        button.bind_property('active', flap, 'reveal-flap', GObject.BindingFlags.BIDIRECTIONAL);
        let headerBox = new Gtk.Grid({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_bottom: 10
        });

        let restoreDefaultsButton = new Gtk.Button({
            label: _("Reset"),
            hexpand: true,
            halign: Gtk.Align.END
        });
        context = restoreDefaultsButton.get_style_context();
        context.add_class('suggested-action');
        restoreDefaultsButton.connect("clicked", () => {
            let currentPage = this.settingsFrameStack.get_visible_child();
            if(!currentPage)
                return;
            if(currentPage.restoreDefaults)
                currentPage.restoreDefaults();
        });

        headerBox.attach(button, 0, 0, 1, 1);
        headerBox.attach(this.headerLabel, 0, 0, 1, 1);
        headerBox.attach(restoreDefaultsButton, 0, 0, 1, 1);

        this.mainGroup.add(headerBox);
        this.mainGroup.add(flap);
    }

    populateSettingsFrameStack(){
        this.settingsFrameStack.add_named(new MenuSettingsGeneralPage(this._settings), "MenuSettingsGeneral");
        this.settingsFrameStack.add_named(new ButtonAppearancePage(this._settings), "ButtonSettings");
        this.settingsFrameStack.add_named(new MenuSettingsListPage(this._settings, Constants.MenuSettingsListType.PINNED_APPS), "MenuSettingsPinnedApps");

        let pinnedPage = this.settingsFrameStack.get_child_by_name("MenuSettingsPinnedApps");

        /*if(this.pinnedAppsChangedID){
            this._settings.disconnect(this.pinnedAppsChangedID);
            this.pinnedAppsChangedID = null;
        }
        this.pinnedAppsChangedID = this._settings.connect("changed::pinned-app-list", () =>{
            pinnedPage.frame.remove_all_children();
            pinnedPage._createFrame(this._settings.get_strv('pinned-app-list'));
            pinnedPage.frame.show();
        });*/

        this.settingsFrameStack.add_named(new MenuSettingsListPage(this._settings, Constants.MenuSettingsListType.DIRECTORIES), "MenuSettingsShortcutDirectories");
        this.settingsFrameStack.add_named(new MenuSettingsListPage(this._settings, Constants.MenuSettingsListType.APPLICATIONS), "MenuSettingsShortcutApplications");
        this.settingsFrameStack.add_named(new MenuSettingsListOtherPage(this._settings, Constants.MenuSettingsListType.POWER_OPTIONS), "MenuSettingsPowerOptions");
        this.settingsFrameStack.add_named(new MenuSettingsSearchOptionsPage(this._settings), "MenuSettingsSearchOptions");
        this.settingsFrameStack.add_named(new MenuSettingsListOtherPage(this._settings, Constants.MenuSettingsListType.EXTRA_CATEGORIES), "MenuSettingsCategories");
        this.settingsFrameStack.add_named(new MenuSettingsNewAppsPage(this._settings), "MenuSettingsNewApps");
        this.settingsFrameStack.add_named(new MenuSettingsFineTunePage(this._settings), "MenuSettingsFineTune");
    }
});
function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

function fillPreferencesWindow(window) {
    window.set_search_enabled(true);
    this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);

    let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    if(!iconTheme.get_search_path().includes(Me.path + "/media/icons/prefs_icons"))
        iconTheme.add_search_path(Me.path + "/media/icons/prefs_icons");

    window.default_width = this._settings.get_int('settings-width');
    window.default_height = this._settings.get_int('settings-height');
    window.set_title(_("ArcMenu Settings"));

    const generalSettingPage = new GeneralPage(this._settings);
    window.add(generalSettingPage);

    const menuLayoutsPage = new MenuLayoutPage(this._settings);
    window.add(menuLayoutsPage);

    const menuThemePage = new MenuThemePage(this._settings);
    window.add(menuThemePage);

    const menuSettingsPage = new BuildMenuSettingsPages();
    window.add(menuSettingsPage);

    const miscPage = new MiscPage(this._settings, menuSettingsPage);
    window.add(miscPage);

    const aboutPage = new AboutPage(this._settings);
    window.add(aboutPage);

    if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.MAIN){
        window.set_visible_page(generalSettingPage);
    }
    else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.CUSTOMIZE_MENU){
        window.set_visible_page(menuSettingsPage);
        menuSettingsPage.menuSettingsStackListBox.selectRowByName("MenuSettingsGeneral");
    }
    else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.MENU_LAYOUT){
        window.set_visible_page(menuLayoutsPage);
    }
    else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.BUTTON_APPEARANCE){
        window.set_visible_page(menuSettingsPage);
        menuSettingsPage.menuSettingsStackListBox.selectRowByName("ButtonSettings");
    }
    else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.LAYOUT_TWEAKS){
        window.set_visible_page(menuLayoutsPage);
        menuLayoutsPage.displayLayoutTweaksPage();
    }
    else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.RUNNER_TWEAKS){
        window.set_visible_page(menuLayoutsPage);
        menuLayoutsPage.displayRunnerTweaksPage();
    }
    else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.ABOUT){
        window.set_visible_page(aboutPage);
    }
    this._settings.set_int('prefs-visible-page', Constants.PrefsVisiblePage.MAIN);

}

function checkIfValidShortcut(frameRow, icon){
    if(frameRow._cmd.endsWith(".desktop") && !Gio.DesktopAppInfo.new(frameRow._cmd)){
        icon.icon_name = 'warning-symbolic';
        frameRow.title = "<b><i>" + _("Invalid Shortcut") + "</i></b> "+ _(frameRow.title);
    }
}

function getIconPath(listing){
    let path, icon;

    if(listing[2]=="ArcMenu_Home")
        path = GLib.get_home_dir();
    else if(listing[2].startsWith("ArcMenu_")){
        let string = listing[2];
        path = string.replace("ArcMenu_",'');
        if(path === "Documents")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        else if(path === "Downloads")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
        else if(path === "Music")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC);
        else if(path === "Pictures")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
        else if(path === "Videos")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS);
        else
            path = null;
    }
    else if(listing[1] == listing[2])
        path = listing[2];
    else if(listing[1] == "ArcMenu_Folder"){
        path = listing[2];
    }
    else
        path = null;

    if(path){
        let file = Gio.File.new_for_path(path);
        try {
            let info = file.query_info('standard::symbolic-icon', 0, null);
            icon = info.get_symbolic_icon();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!file.is_native()) {
                    icon = new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    icon = new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
        return icon.to_string();
    }
    else{
        if(listing[2]=="ArcMenu_Network")
            return  'network-workgroup-symbolic';
        else if(listing[2]=="ArcMenu_Computer")
            return  'drive-harddisk-symbolic';
        else
            return listing[1];
    }
}
