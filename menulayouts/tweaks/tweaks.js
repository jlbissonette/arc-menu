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

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Adw, Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Prefs = Me.imports.prefs;
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var TweaksPage = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},  class Arc_Menu_TweaksPage extends Gtk.Box {
    _init(settings, layoutName) {
        this._settings = settings;
        this.addResponse = false;
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.layoutNameLabel = new Gtk.Label({
            label: "<b>" + _(layoutName) + "</b>",
            use_markup: true,
            xalign: 0,
            hexpand: true,
            halign: Gtk.Align.CENTER
        })

        let backButton = new PW.Button({
            icon_name: 'go-previous-symbolic',
            title: _("Back"),
            icon_first: true,
        });
        let context = backButton.get_style_context();
        context.add_class('suggested-action');
        backButton.halign = Gtk.Align.START;
        backButton.connect('clicked', ()=> {
            this.emit('response', -20);
        });
        this.headerBox = new Gtk.Grid({
            hexpand: true,
            halign: Gtk.Align.FILL,
            margin_bottom: 10,
        });

        this.headerBox.attach(backButton, 0, 0, 1, 1);
        this.headerBox.attach(this.layoutNameLabel, 0, 0, 1, 1);
        this.mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.append(this.headerBox);
        this.append(this.mainBox);
        this._createLayout();
    }

    setActiveLayout(menuLayout, layoutName){
        if(layoutName)
            this.layoutNameLabel.label = "<b>" + _(layoutName) + "</b>";
        let children = [...this.mainBox];
        for(let child of children){
            this.mainBox.remove(child);
        }         
        this._createLayout(menuLayout);
    }

    _createLayout(menuLayout) {
        if(!menuLayout)
            menuLayout = this._settings.get_enum('menu-layout');

        if(menuLayout == Constants.MenuLayout.ARCMENU)
            this._loadArcMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.BRISK)
            this._loadBriskMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.WHISKER)
            this._loadWhiskerMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.GNOME_MENU)
            this._loadGnomeMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.MINT)
            this._loadMintMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.ELEMENTARY)
            this._loadElementaryTweaks();
        else if(menuLayout == Constants.MenuLayout.GNOME_OVERVIEW)
            this._loadGnomeOverviewTweaks();
        else if(menuLayout == Constants.MenuLayout.REDMOND)
            this._loadRedmondMenuTweaks()
        else if(menuLayout == Constants.MenuLayout.UNITY)
            this._loadUnityTweaks();
        else if(menuLayout == Constants.MenuLayout.RAVEN)
            this._loadRavenTweaks();
        else if(menuLayout == Constants.MenuLayout.BUDGIE)
            this._loadBudgieMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.INSIDER)
            this._loadInsiderMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.RUNNER)
            this._loadRunnerMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.CHROMEBOOK)
            this._loadChromebookTweaks();
        else if(menuLayout == Constants.MenuLayout.TOGNEE)
            this._loadTogneeMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.PLASMA)
            this._loadPlasmaMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.WINDOWS)
            this._loadWindowsTweaks();
        else if(menuLayout == Constants.MenuLayout.ELEVEN)
            this._loadElevenTweaks();
        else
            this._loadPlaceHolderTweaks();
    }

    _createActivateOnHoverRow(){
        let activateOnHoverRow = new Adw.ActionRow({
            title: _("Category Activation")
        });
        let activateOnHoverCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        activateOnHoverCombo.append_text(_("Mouse Click"));
        activateOnHoverCombo.append_text(_("Mouse Hover"));
        if(this._settings.get_boolean('activate-on-hover'))
            activateOnHoverCombo.set_active(1);
        else 
            activateOnHoverCombo.set_active(0);
            activateOnHoverCombo.connect('changed', (widget) => {
            if(widget.get_active()==0)
                this._settings.set_boolean('activate-on-hover',false);
            if(widget.get_active()==1)
                this._settings.set_boolean('activate-on-hover',true);
        });
        activateOnHoverRow.add_suffix(activateOnHoverCombo);
        return activateOnHoverRow;
    }
    _createAvatarShapeRow(){
        let avatarStyleRow = new Adw.ActionRow({
            title: _('Avatar Icon Shape')
        });
        let avatarStyleCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        avatarStyleCombo.append_text(_("Circular"));
        avatarStyleCombo.append_text(_("Square"));
        avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
        avatarStyleCombo.connect('changed', (widget) => {
            this._settings.set_enum('avatar-style', widget.get_active());
        });

        avatarStyleRow.add_suffix(avatarStyleCombo);
        return avatarStyleRow;
    }
    _createSearchBarLocationRow(bottomDefault){
        let searchBarLocationSetting = bottomDefault ? 'searchbar-default-bottom-location' : 'searchbar-default-top-location';
                
        let searchbarLocationRow = new Adw.ActionRow({
            title: _("Searchbar Location")
        });

        let searchbarLocationCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER
        });
        searchbarLocationCombo.append_text(_("Bottom"));
        searchbarLocationCombo.append_text(_("Top"));
        searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting ));
        searchbarLocationCombo.connect('changed', (widget) => {
            this._settings.set_enum(searchBarLocationSetting , widget.get_active());
        });

        searchbarLocationRow.add_suffix(searchbarLocationCombo);
        return searchbarLocationRow;
    }
    _createFlipHorizontalRow(){
        let horizontalFlipRow = new Adw.ActionRow({
            title: _("Flip Layout Horizontally")
        });

        let horizontalFlipSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        horizontalFlipSwitch.set_active(this._settings.get_boolean('enable-horizontal-flip'));
        horizontalFlipSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('enable-horizontal-flip', widget.get_active());
        });
    
        horizontalFlipRow.add_suffix(horizontalFlipSwitch);
        return horizontalFlipRow;
    }
    _disableAvatarRow(){
        let disableAvatarRow = new Adw.ActionRow({
            title: _('Disable User Avatar')
        });

        let disableAvatarSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        disableAvatarSwitch.set_active(this._settings.get_boolean('disable-user-avatar'));
        disableAvatarSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('disable-user-avatar', widget.get_active());
        });

        disableAvatarRow.add_suffix(disableAvatarSwitch);
        return disableAvatarRow;
    }

    _loadElevenTweaks(){
        let elevenTweaksFrame = new Adw.PreferencesGroup();
        let disableFrequentAppsRow = new Adw.ActionRow({
            title: _("Disable Frequent Apps")
        });
        let disableFrequentAppsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        disableFrequentAppsSwitch.set_active(this._settings.get_boolean('eleven-disable-frequent-apps'));
        disableFrequentAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('eleven-disable-frequent-apps', widget.get_active());
        });
        disableFrequentAppsRow.add_suffix(disableFrequentAppsSwitch);
        elevenTweaksFrame.add(disableFrequentAppsRow);
        this.mainBox.append(elevenTweaksFrame);
    }

    _loadGnomeOverviewTweaks(){
        let gnomeOverviewTweaksFrame = new Adw.PreferencesGroup();
        let appsGridRow = new Adw.ActionRow({
            title: _("Show Applications Grid")
        });
        let appsGridSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        appsGridSwitch.set_active(this._settings.get_boolean('gnome-dash-show-applications'));
        appsGridSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('gnome-dash-show-applications', widget.get_active());
        });
        appsGridRow.add_suffix(appsGridSwitch);
        gnomeOverviewTweaksFrame.add(appsGridRow);
        this.mainBox.append(gnomeOverviewTweaksFrame);
    }

    _loadWindowsTweaks(){
        let windowsTweaksFrame = new Adw.PreferencesGroup();
        let frequentAppsRow = new Adw.ActionRow({
            title: _("Disable Frequent Apps")
        });

        let frequentAppsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        frequentAppsSwitch.set_active(this._settings.get_boolean('windows-disable-frequent-apps'));
        frequentAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('windows-disable-frequent-apps', widget.get_active());
        });

        frequentAppsRow.add_suffix(frequentAppsSwitch);
        windowsTweaksFrame.add(frequentAppsRow);

        let pinnedAppsRow = new Adw.ActionRow({
            title: _("Disable Pinned Apps")
        });
        let pinnedAppsSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        pinnedAppsSwitch.set_active(this._settings.get_boolean('windows-disable-pinned-apps'));
        pinnedAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('windows-disable-pinned-apps', widget.get_active());
        });
        pinnedAppsRow.add_suffix(pinnedAppsSwitch);
        windowsTweaksFrame.add(pinnedAppsRow);

        this.mainBox.append(windowsTweaksFrame);
    }

    _loadPlasmaMenuTweaks(){
        let plasmaMenuTweaksFrame = new Adw.PreferencesGroup();
        
        let searchBarLocationSetting = 'searchbar-default-top-location';
                
        let searchbarLocationRow = new Adw.ActionRow({
            title: _("Searchbar Location")
        });
        let searchbarLocationCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        searchbarLocationCombo.append_text(_("Bottom"));
        searchbarLocationCombo.append_text(_("Top"));
        searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting));
        searchbarLocationCombo.connect('changed', (widget) => {
            this._settings.set_enum(searchBarLocationSetting , widget.get_active());
        });
        searchbarLocationRow.add_suffix(searchbarLocationCombo);
        plasmaMenuTweaksFrame.add(searchbarLocationRow);

        let hoverRow = new Adw.ActionRow({
            title: _("Activate on Hover")
        });

        let hoverSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER 
        });
        hoverSwitch.set_active(this._settings.get_boolean('plasma-enable-hover'));
        hoverSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('plasma-enable-hover', widget.get_active());
        });
        hoverRow.add_suffix(hoverSwitch);
        plasmaMenuTweaksFrame.add(hoverRow);

        this.mainBox.append(plasmaMenuTweaksFrame);

        let resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
            halign: Gtk.Align.START,
            hexpand: true
        });
        resetButton.set_sensitive(true);
        resetButton.connect('clicked', ()=> {
            let hoverEnabled = this._settings.get_default_value('plasma-enable-hover').unpack();
            let showDescriptions = this._settings.get_default_value('apps-show-extra-details').unpack();
            this._settings.reset('searchbar-default-top-location');
            searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting));
            hoverSwitch.set_active(hoverEnabled);
            descriptionsSwitch.set_active(showDescriptions);
            this._settings.reset('plasma-enable-hover');
            this._settings.reset('apps-show-extra-details');
        });
        this.mainBox.append(resetButton);
    }
    _loadBriskMenuTweaks(){
        let briskMenuTweaksFrame = new Adw.PreferencesGroup();
        briskMenuTweaksFrame.add(this._createActivateOnHoverRow());
        briskMenuTweaksFrame.add(this._createSearchBarLocationRow());
        briskMenuTweaksFrame.add(this._createFlipHorizontalRow());

        let pinnedAppsFrame = new Adw.PreferencesGroup({
            title: _("Brisk Menu Shortcuts")
        });
        let pinnedApps = new Prefs.MenuSettingsListPage(this._settings, Constants.MenuSettingsListType.OTHER, 'brisk-shortcuts-list');
        pinnedAppsFrame.add(pinnedApps);
        this.mainBox.append(briskMenuTweaksFrame);
        this.mainBox.append(pinnedAppsFrame);
    }

    _loadChromebookTweaks(){
        let chromeBookTweaksFrame = new Adw.PreferencesGroup();
        chromeBookTweaksFrame.add(this._createSearchBarLocationRow());
        this.mainBox.append(chromeBookTweaksFrame);
    }
    _loadElementaryTweaks(){
        let elementaryTweaksFrame = new Adw.PreferencesGroup();
        elementaryTweaksFrame.add(this._createSearchBarLocationRow());
        this.mainBox.append(elementaryTweaksFrame);
    }
    _loadBudgieMenuTweaks(){
        let budgieMenuTweaksFrame = new Adw.PreferencesGroup();
        budgieMenuTweaksFrame.add(this._createActivateOnHoverRow());
        budgieMenuTweaksFrame.add(this._createSearchBarLocationRow());
        budgieMenuTweaksFrame.add(this._createFlipHorizontalRow());

        let enableActivitiesRow = new Adw.ActionRow({
            title: _('Enable Activities Overview Shortcut')
        });
        let enableActivitiesSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER
        });
        enableActivitiesSwitch.set_active(this._settings.get_boolean('enable-activities-shortcut'));
        enableActivitiesSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('enable-activities-shortcut', widget.get_active());
        });
        enableActivitiesRow.add_suffix(enableActivitiesSwitch);
        budgieMenuTweaksFrame.add(enableActivitiesRow);

        this.mainBox.append(budgieMenuTweaksFrame);
    }
    _loadRunnerMenuTweaks(){
        let runnerMenuTweaksFrame = new Adw.PreferencesGroup();
        let runnerPositionRow = new Adw.ActionRow({
            title: _('Position')
        });
        let runnerPositionCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        runnerPositionCombo.append_text(_("Top"));
        runnerPositionCombo.append_text(_("Centered"));
        runnerPositionCombo.set_active(this._settings.get_enum('runner-position'));
        runnerPositionCombo.connect('changed', (widget) => {
            this._settings.set_enum('runner-position', widget.get_active());
        });
        runnerPositionRow.add_suffix(runnerPositionCombo);
        runnerMenuTweaksFrame.add(runnerPositionRow);

        let runnerWidthRow = new Adw.ActionRow({
            title: _("Width")
        });
        let runnerWidthScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: 1000,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            hexpand: true,
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        runnerWidthScale.add_mark(500, Gtk.PositionType.TOP, _("Default"));
        runnerWidthScale.set_value(this._settings.get_int('runner-menu-width'));
        runnerWidthScale.connect('value-changed', (widget) => {
            this._settings.set_int('runner-menu-width', widget.get_value());
        });
        runnerWidthRow.add_suffix(runnerWidthScale);
        runnerMenuTweaksFrame.add(runnerWidthRow);

        let runnerHeightRow = new Adw.ActionRow({
            title: _("Height")
        });
        let runnerHeightScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: 1000,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            hexpand: true,
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        runnerHeightScale.add_mark(400, Gtk.PositionType.TOP, _("Default"));
        runnerHeightScale.set_value(this._settings.get_int('runner-menu-height'));
        runnerHeightScale.connect('value-changed', (widget) => {
            this._settings.set_int('runner-menu-height', widget.get_value());
        });
        runnerHeightRow.add_suffix(runnerHeightScale);
        runnerMenuTweaksFrame.add(runnerHeightRow);

        let runnerFontSizeRow = new Adw.ActionRow({
            title: _("Font Size")
        });
        let runnerFontSizeScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 30,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            hexpand: true,
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT
        });

        runnerFontSizeScale.add_mark(0, Gtk.PositionType.TOP, _("Default"));
        runnerFontSizeScale.set_value(this._settings.get_int('runner-font-size'));
        runnerFontSizeScale.connect('value-changed', (widget) => {
            this._settings.set_int('runner-font-size', widget.get_value());
        });
        runnerFontSizeRow.add_suffix(runnerFontSizeScale);
        runnerMenuTweaksFrame.add(runnerFontSizeRow);

        let frequentAppsRow = new Adw.ActionRow({
            title: _("Show Frequent Apps")
        });
        let frequentAppsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        if(this._settings.get_boolean('runner-show-frequent-apps'))
            frequentAppsSwitch.set_active(true);
        frequentAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('runner-show-frequent-apps', widget.get_active());
        });   
        frequentAppsRow.add_suffix(frequentAppsSwitch);
        runnerMenuTweaksFrame.add(frequentAppsRow);

        this.mainBox.append(runnerMenuTweaksFrame);
    }
    _loadUnityTweaks(){
        let generalTweaksFrame = new Adw.PreferencesGroup();
        let homeScreenRow = new Adw.ActionRow({
            title: _('Default View')
        });
        let homeScreenCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        homeScreenCombo.append_text(_("Home Screen"));
        homeScreenCombo.append_text(_("All Programs"));
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        homeScreenCombo.set_active(homeScreen ? 0 : 1);
        homeScreenCombo.connect('changed', (widget) => {
            let enable =  widget.get_active() ==0 ? true : false;
            this._settings.set_boolean('enable-unity-homescreen', enable);
        });
        homeScreenRow.add_suffix(homeScreenCombo);
        generalTweaksFrame.add(homeScreenRow);
        this.mainBox.append(generalTweaksFrame);

        let widgetFrame = this._createWidgetsRows(Constants.MenuLayout.UNITY);
        this.mainBox.append(widgetFrame);

        let pinnedAppsFrame = new Adw.PreferencesGroup({
            title: _("Unity Layout Buttons")
        });
        let pinnedApps = new Prefs.MenuSettingsListPage(this._settings, Constants.MenuSettingsListType.OTHER, 'unity-pinned-app-list');
        pinnedAppsFrame.add(pinnedApps);
        this.mainBox.append(pinnedAppsFrame);

        let pinnedAppsSeparatorFrame = new Adw.PreferencesGroup({
            title: _("Button Separator Position")
        });
        let pinnedAppsSeparatorRow = new Adw.ActionRow({
            title:  _("Separator Position")
        });
        let pinnedAppsSeparatorScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL, 
            adjustment: new Gtk.Adjustment({lower: 0, upper: 7, step_increment: 1, page_increment: 1, page_size: 0}),
            digits: 0, round_digits: 0, hexpand: true,
            draw_value: true
        });
        pinnedAppsSeparatorScale.add_mark(0, Gtk.PositionType.BOTTOM, _("None"));
        pinnedAppsSeparatorScale.set_value(this._settings.get_int('unity-separator-index'));
        pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
            this._settings.set_int('unity-separator-index', widget.get_value());
        }); 
        
        let infoButton = new PW.Button({
            icon_name: 'info-circle-symbolic'
        });
        infoButton.connect('clicked', ()=> {
            let dialog = new Gtk.MessageDialog({
                text: "<b>" + _("Adjust the position of the separator in the button panel") + '</b>',
                use_markup: true,
                buttons: Gtk.ButtonsType.OK,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true
            });
            dialog.connect('response', (widget, response) => {
                dialog.destroy();
            });
            dialog.show();
        });

        pinnedAppsSeparatorRow.add_suffix(pinnedAppsSeparatorScale);
        pinnedAppsSeparatorRow.add_suffix(infoButton);
        pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
        this.mainBox.append(pinnedAppsSeparatorFrame);
    }
    _loadRavenTweaks(){
        let generalTweaksFrame = new Adw.PreferencesGroup();
        let homeScreenRow = new Adw.ActionRow({
            title: _('Default View')
        });
        let homeScreenCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        homeScreenCombo.append_text(_("Home Screen"));
        homeScreenCombo.append_text(_("All Programs"));
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        homeScreenCombo.set_active(homeScreen ? 0 : 1);
        homeScreenCombo.connect('changed', (widget) => {
            let enable =  widget.get_active() ==0 ? true : false;
            this._settings.set_boolean('enable-unity-homescreen', enable);
        });
        homeScreenRow.add_suffix(homeScreenCombo);
        generalTweaksFrame.add(homeScreenRow);
        this.mainBox.append(generalTweaksFrame);

        let ravenPositionRow = new Adw.ActionRow({
            title: _('Position on Monitor')
        });
        let ravenPositionCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER 
        });
        ravenPositionCombo.append_text(_("Left"));
        ravenPositionCombo.append_text(_("Right"));
        let ravenPosition = this._settings.get_enum('raven-position');
        ravenPositionCombo.set_active(ravenPosition);
        ravenPositionCombo.connect('changed', (widget) => {
            this._settings.set_enum('raven-position', widget.get_active());
        });
        ravenPositionRow.add_suffix(ravenPositionCombo);
        generalTweaksFrame.add(ravenPositionRow);
        generalTweaksFrame.add(this._createActivateOnHoverRow());
        let widgetFrame = this._createWidgetsRows(Constants.MenuLayout.RAVEN);
        this.mainBox.append(widgetFrame);
    }
    _loadMintMenuTweaks(){
        let mintMenuTweaksFrame = new Adw.PreferencesGroup();
        mintMenuTweaksFrame.add(this._createActivateOnHoverRow());
        mintMenuTweaksFrame.add(this._createSearchBarLocationRow());
        mintMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.append(mintMenuTweaksFrame);

        let pinnedAppsFrame = new Adw.PreferencesGroup({
            title: _("Mint Layout Shortcuts")
        });
        let pinnedApps = new Prefs.MenuSettingsListPage(this._settings, Constants.MenuSettingsListType.OTHER, 'mint-pinned-app-list');
        pinnedAppsFrame.add(pinnedApps);
        this.mainBox.append(pinnedAppsFrame);

        let pinnedAppsSeparatorFrame = new Adw.PreferencesGroup({
            title: _("Shortcut Separator Position")
        });
        let pinnedAppsSeparatorRow = new Adw.ActionRow({
            title:_("Separator Position")
        });
        let pinnedAppsSeparatorScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL, 
            adjustment: new Gtk.Adjustment({lower: 0, upper: 7, step_increment: 1, page_increment: 1, page_size: 0}),
            digits: 0, round_digits: 0, hexpand: true,
            draw_value: true,
        });
        pinnedAppsSeparatorScale.add_mark(0, Gtk.PositionType.BOTTOM, _("None"));
        pinnedAppsSeparatorScale.set_value(this._settings.get_int('mint-separator-index'));
        pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
            this._settings.set_int('mint-separator-index', widget.get_value());
        }); 

        let infoButton = new PW.Button({
            icon_name: 'info-circle-symbolic'
        });
        infoButton.connect('clicked', ()=> {
            let dialog = new Gtk.MessageDialog({
                text: "<b>" + _("Adjust the position of the separator in the button panel") + '</b>',
                use_markup: true,
                buttons: Gtk.ButtonsType.OK,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true
            });
            dialog.connect('response', (widget, response) => {
                dialog.destroy();
            });
            dialog.show();
        });
        pinnedAppsSeparatorRow.add_suffix(pinnedAppsSeparatorScale);
        pinnedAppsSeparatorRow.add_suffix(infoButton);
        pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
        this.mainBox.append(pinnedAppsSeparatorFrame);
    }

    _loadWhiskerMenuTweaks(){
        let whiskerMenuTweaksFrame = new Adw.PreferencesGroup();
        whiskerMenuTweaksFrame.add(this._createActivateOnHoverRow());
        whiskerMenuTweaksFrame.add(this._createAvatarShapeRow());
        whiskerMenuTweaksFrame.add(this._createSearchBarLocationRow());
        whiskerMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.append(whiskerMenuTweaksFrame);
    }
    _loadRedmondMenuTweaks(){
        let redmondMenuTweaksFrame = new Adw.PreferencesGroup();
        redmondMenuTweaksFrame.add(this._createSearchBarLocationRow());

        redmondMenuTweaksFrame.add(this._createFlipHorizontalRow());
        redmondMenuTweaksFrame.add(this._createAvatarShapeRow());
        redmondMenuTweaksFrame.add(this._disableAvatarRow());

        let placesFrame = new Adw.PreferencesGroup();
        let externalDeviceRow = new Adw.ActionRow({
            title: _("External Devices")
        });

        let externalDeviceButton = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        if(this._settings.get_boolean('show-external-devices'))
            externalDeviceButton.set_active(true);
        externalDeviceButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-external-devices', widget.get_active());
        });   
        externalDeviceRow.add_suffix(externalDeviceButton);

        placesFrame.add(externalDeviceRow);
                
        let bookmarksRow = new Adw.ActionRow({
            title: _("Bookmarks")
        });
        let bookmarksButton = new Gtk.Switch({
            valign: Gtk.Align.CENTER
        });
        if(this._settings.get_boolean('show-bookmarks'))
            bookmarksButton.set_active(true);
        bookmarksButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-bookmarks', widget.get_active());
        });   
        bookmarksRow.add_suffix(bookmarksButton);

        placesFrame.add(bookmarksRow); 
        this.mainBox.append(redmondMenuTweaksFrame);  
        this.mainBox.append(new Gtk.Label({
            label: "<b>" + _("Extra Shortcuts") + "</b>",
            use_markup: true,
            xalign: 0,
            hexpand: true
        }));
        this.mainBox.append(placesFrame);

    }
    _loadInsiderMenuTweaks(){
        let insiderMenuTweaksFrame = new Adw.PreferencesGroup();
        insiderMenuTweaksFrame.add(this._createAvatarShapeRow());
        this.mainBox.append(insiderMenuTweaksFrame);
    }
    _loadGnomeMenuTweaks(){
        let gnomeMenuTweaksFrame = new Adw.PreferencesGroup();
        gnomeMenuTweaksFrame.add(this._createActivateOnHoverRow());
        gnomeMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.append(gnomeMenuTweaksFrame);
    }
    _loadPlaceHolderTweaks(){
        let placeHolderFrame = new Adw.PreferencesGroup();
        let placeHolderRow = new Adw.ActionRow({
            title: _("Nothing Yet!"),
        });
        placeHolderFrame.add(placeHolderRow);
        this.mainBox.append(placeHolderFrame);
    }
    _loadTogneeMenuTweaks(){
        let togneeMenuTweaksFrame = new Adw.PreferencesGroup();
        let searchBarBottomDefault = true;
        let defaulViewRow = new Adw.ActionRow({
            title: _("Default View"),
        });
        let defaultViewCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER
        });
        defaultViewCombo.append_text(_("Categories List"));
        defaultViewCombo.append_text(_("All Programs"));
        defaultViewCombo.set_active(this._settings.get_enum('default-menu-view-tognee'));
        defaultViewCombo.connect('changed', (widget) => {
            this._settings.set_enum('default-menu-view-tognee', widget.get_active());
        });
        defaulViewRow.add_suffix(defaultViewCombo);
        togneeMenuTweaksFrame.add(defaulViewRow);
        togneeMenuTweaksFrame.add(this._createSearchBarLocationRow(searchBarBottomDefault));
        togneeMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.append(togneeMenuTweaksFrame);
    }
    _loadArcMenuTweaks(){
        let arcMenuTweaksFrame = new Adw.PreferencesGroup();
        let defaulViewRow = new Adw.ActionRow({
            title: _("Default View")
        });
        let defaultViewCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER,
        });
        defaultViewCombo.append_text(_("Pinned Apps"));
        defaultViewCombo.append_text(_("Categories List"));
        defaultViewCombo.append_text(_("Frequent Apps"));
        defaultViewCombo.append_text(_("All Programs"));
        defaultViewCombo.set_active(this._settings.get_enum('default-menu-view'));
        defaultViewCombo.connect('changed', (widget) => {
            this._settings.set_enum('default-menu-view', widget.get_active());
        });

        defaulViewRow.add_suffix(defaultViewCombo);
        arcMenuTweaksFrame.add(defaulViewRow);

        let searchBarBottomDefault = true;
        arcMenuTweaksFrame.add(this._createSearchBarLocationRow(searchBarBottomDefault));
        arcMenuTweaksFrame.add(this._createFlipHorizontalRow());
        arcMenuTweaksFrame.add(this._createAvatarShapeRow());
        arcMenuTweaksFrame.add(this._disableAvatarRow());
        this.mainBox.append(arcMenuTweaksFrame);

        let placesFrame = new Adw.PreferencesGroup({
            title: _("Extra Shortcuts")
        });
        let externalDeviceRow = new Adw.ActionRow({
            title: _("External Devices")
        });
        let externalDeviceButton = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        externalDeviceButton.set_active(this._settings.get_boolean('show-external-devices'));
        externalDeviceButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-external-devices', widget.get_active());
        });   
        externalDeviceRow.add_suffix(externalDeviceButton);
        placesFrame.add(externalDeviceRow);
                
        let bookmarksRow = new Adw.ActionRow({
            title: _("Bookmarks")
        });
        let bookmarksButton = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        bookmarksButton.set_active(this._settings.get_boolean('show-bookmarks'));
        bookmarksButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-bookmarks', widget.get_active());
        });   
        bookmarksRow.add_suffix(bookmarksButton);
        placesFrame.add(bookmarksRow);
        this.mainBox.append(placesFrame);
        
        let extraCategoriesFrame = new Adw.PreferencesGroup({
            title: _("Extra Categories Quick Links"),
            description: _("Display quick links of extra categories on the home page\nSee Customize Menu -> Extra Categories")
        });
        let extraCategoriesLinksBox = new Prefs.MenuSettingsListOtherPage(this._settings, Constants.MenuSettingsListType.QUICK_LINKS);
        extraCategoriesFrame.add(extraCategoriesLinksBox);
        this.mainBox.append(extraCategoriesFrame);

        let extraCategoriesLocationFrame = new Adw.PreferencesGroup();
        let extraCategoriesLocationRow = new Adw.ActionRow({
            title: _("Quick Links Location")
        });
        let extraCategoriesLocationCombo = new Gtk.ComboBoxText({ 
            valign: Gtk.Align.CENTER,
        });
        extraCategoriesLocationCombo.append_text(_("Bottom"));
        extraCategoriesLocationCombo.append_text(_("Top"));
        extraCategoriesLocationCombo.set_active(this._settings.get_enum('arcmenu-extra-categories-links-location'));
        extraCategoriesLocationCombo.connect('changed', (widget) => {
            this._settings.set_enum('arcmenu-extra-categories-links-location' , widget.get_active());
        });

        extraCategoriesLocationRow.add_suffix(extraCategoriesLocationCombo);
        extraCategoriesLocationFrame.add(extraCategoriesLocationRow);
        this.mainBox.append(extraCategoriesLocationFrame);
    }
    _createWidgetsRows(layout){
        let weatherWidgetSetting = 'enable-weather-widget-raven';
        let clockWidgetSetting = 'enable-clock-widget-raven';
        if(layout == Constants.MenuLayout.RAVEN){
            weatherWidgetSetting = 'enable-weather-widget-raven';
            clockWidgetSetting = 'enable-clock-widget-raven';
        }
        else{
            weatherWidgetSetting = 'enable-weather-widget-unity';
            clockWidgetSetting = 'enable-clock-widget-unity';
        }
        
        let widgetFrame = new Adw.PreferencesGroup();
        let weatherWidgetRow = new Adw.ActionRow({
            title: _("Enable Weather Widget"),
        });

        let weatherWidgetSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        weatherWidgetSwitch.set_active(this._settings.get_boolean(weatherWidgetSetting));
        weatherWidgetSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean(weatherWidgetSetting, widget.get_active());
        });
        weatherWidgetRow.add_suffix(weatherWidgetSwitch);
        widgetFrame.add(weatherWidgetRow);

        let clockWidgetRow = new Adw.ActionRow({
            title: _("Enable Clock Widget"),
        });
        let clockWidgetSwitch = new Gtk.Switch({ 
            valign: Gtk.Align.CENTER 
        });
        clockWidgetSwitch.set_active(this._settings.get_boolean(clockWidgetSetting));
        clockWidgetSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean(clockWidgetSetting, widget.get_active());
        });
        clockWidgetRow.add_suffix(clockWidgetSwitch);
        widgetFrame.add(clockWidgetRow);

        return widgetFrame;
    }
});
