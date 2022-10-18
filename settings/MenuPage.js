const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gio, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const PW = Me.imports.prefsWidgets;
const Settings = Me.imports.settings;
const _ = Gettext.gettext;

const { FineTunePage } = Settings.Menu.FineTunePage;
const { LayoutsPage } = Settings.Menu.LayoutsPage;
const { LayoutTweaksPage } = Settings.Menu.LayoutTweaksPage;
const { ListOtherPage } = Settings.Menu.ListOtherPage;
const { ListPinnedPage } = Settings.Menu.ListPinnedPage;
const { SearchOptionsPage } = Settings.Menu.SearchOptionsPage;
const { ThemePage } = Settings.Menu.ThemePage;
const { VisualSettingsPage } = Settings.Menu.VisualSettings;
const { SettingsUtils } = Settings;

var MenuPage = GObject.registerClass(
class ArcMenu_MenuPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Menu'),
            icon_name: 'settings-settings-symbolic',
            name: 'MenuPage'
        });
        this._settings = settings;

        let mainGroup = new Adw.PreferencesGroup();
        this.add(mainGroup);

        let mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.mainLeaflet = new Adw.Leaflet({
            homogeneous: false,
            transition_type: Adw.LeafletTransitionType.SLIDE,
            can_navigate_back: true,
            can_navigate_forward: false,
            can_unfold: false,
        });

        this.subLeaflet = new Adw.Leaflet({
            homogeneous: false,
            transition_type: Adw.LeafletTransitionType.SLIDE,
            can_navigate_back: false,
            can_navigate_forward: false,
            can_unfold: false,
        });

        let leafletPage = this.mainLeaflet.append(mainBox);
        leafletPage.name = "MainView";

        leafletPage = this.mainLeaflet.append(this.subLeaflet);
        leafletPage.name = "SubView";

        mainGroup.add(this.mainLeaflet);

        let menuLooksGroup = new Adw.PreferencesGroup({
            title: _("How should the menu look?"),
        });
        mainBox.append(menuLooksGroup);

        let layoutRow = new SettingRow(this._settings, {
            title: _('Menu Layout'),
            subtitle: _('Choose the style of the menu'),
            icon_name: 'settings-layouts-symbolic'
        });
        layoutRow.addPage({
            pageClass: LayoutsPage,
            leaftletName: 'LayoutsPage',
            title: _('Current Menu Layout'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        layoutRow.settingPage.connect('response', (_w, response) => {
            if(response === Gtk.ResponseType.APPLY){
                tweaksRow.title = _(SettingsUtils.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')));
            }
        });
        menuLooksGroup.add(layoutRow);

        let themeRow = new SettingRow(this._settings, {
            title: _('Menu Theme'),
            subtitle: _('Modify colors, font size, and border of the menu'),
            icon_name: 'settings-theme-symbolic'
        });
        themeRow.addPage({
            pageClass: ThemePage,
            leaftletName: 'ThemePage',
            title: _('Menu Theme'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        menuLooksGroup.add(themeRow);

        let visualSettingsRow = new SettingRow(this._settings, {
            title: _('Menu Visual Appearance'),
            subtitle: _('Change menu height and width, menu location, and menu icon sizes'),
            icon_name: 'settings-settings-symbolic'
        });
        visualSettingsRow.addPage({
            pageClass: VisualSettingsPage,
            leaftletName: 'VisualSettingsPage',
            title: _('Menu Visual Appearance'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        menuLooksGroup.add(visualSettingsRow);

        let fineTuneRow = new SettingRow(this._settings, {
            title: _('Fine Tune'),
            subtitle: _('Adjust less commonly used visual settings'),
            icon_name: 'settings-finetune-symbolic'
        });
        fineTuneRow.addPage({
            pageClass: FineTunePage,
            leaftletName: 'FineTunePage',
            title: _('Fine Tune'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        menuLooksGroup.add(fineTuneRow);

        let whatToShowGroup = new Adw.PreferencesGroup({
            title: _("What should show on the menu?"),
        });
        mainBox.append(whatToShowGroup);

        let tweaksRow = new SettingRow(this._settings, {
            title: _(SettingsUtils.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout'))),
            subtitle: _('Settings specific to the current menu layout'),
            icon_name: 'emblem-system-symbolic'
        });
        tweaksRow.addPage({
            pageClass: LayoutTweaksPage,
            leaftletName: 'LayoutTweaksPage',
            title: SettingsUtils.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(tweaksRow);

        let pinnedAppsRow = new SettingRow(this._settings, {
            title: _('Pinned Apps'),
            icon_name: 'view-pin-symbolic'
        });
        pinnedAppsRow.addPage({
            pageClass: ListPinnedPage,
            listType: Constants.MenuSettingsListType.PINNED_APPS,
            leaftletName: 'PinnedAppsPage',
            title: _('Pinned Apps'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(pinnedAppsRow);

        let directoryShortcutsRow = new SettingRow(this._settings, {
            title: _('Directory Shortcuts'),
            icon_name: 'folder-symbolic'
        });
        directoryShortcutsRow.addPage({
            pageClass: ListPinnedPage,
            listType: Constants.MenuSettingsListType.DIRECTORIES,
            leaftletName: 'DirectoryShortcutsPage',
            title: _('Directory Shortcuts'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(directoryShortcutsRow);

        let applicationShortcutsRow = new SettingRow(this._settings, {
            title: _('Application Shortcuts'),
            icon_name: 'view-grid-symbolic'
        });
        applicationShortcutsRow.addPage({
            pageClass: ListPinnedPage,
            listType: Constants.MenuSettingsListType.APPLICATIONS,
            leaftletName: 'ApplicationShortcutsPage',
            title: _('Application Shortcuts'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(applicationShortcutsRow);

        let searchOptionsRow = new SettingRow(this._settings, {
            title: _('Search Options'),
            icon_name: 'preferences-system-search-symbolic'
        });
        searchOptionsRow.addPage({
            pageClass: SearchOptionsPage,
            leaftletName: 'SearchOptionsPage',
            title: _('Search Options'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(searchOptionsRow);

        let powerOptionsRow = new SettingRow(this._settings, {
            title: _('Power Options'),
            subtitle: _('Which power options to show and display style'),
            icon_name: 'gnome-power-manager-symbolic'
        });
        powerOptionsRow.addPage({
            pageClass: ListOtherPage,
            listType: Constants.MenuSettingsListType.POWER_OPTIONS,
            leaftletName: 'PowerOptionsPage',
            title: _('Power Options'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(powerOptionsRow);

        let extraCategoriesRow = new SettingRow(this._settings, {
            title: _('Extra Categories'),
            icon_name: 'view-list-symbolic',
            subtitle: _('Add or Remove additional custom categories')
        });
        extraCategoriesRow.addPage({
            pageClass: ListOtherPage,
            listType: Constants.MenuSettingsListType.EXTRA_CATEGORIES,
            leaftletName: 'ExtraCategoriesPage',
            title: _('Extra Categories'),
            subLeaflet: this.subLeaflet,
            mainLeaflet: this.mainLeaflet,
        });
        whatToShowGroup.add(extraCategoriesRow);
    }
});

var SettingRow = GObject.registerClass(class ArcMenu_MenuLayoutRow extends Adw.ActionRow {
    _init(settings, params) {
        super._init({
            activatable: true,
            ...params
        });
        this._settings = settings;

        let goNextImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        });

        this.add_suffix(goNextImage);
    }

    addPage(pageParams){
        const leafletName = pageParams.leaftletName;
        const title = pageParams.title;
        const subLeaflet = pageParams.subLeaflet;
        const mainLeaflet = pageParams.mainLeaflet;
        const PageClass = pageParams.pageClass;
        const settingListType = pageParams.listType;

        this.settingPage = new PageClass(this._settings, settingListType);

        let buttonBox = new Gtk.Grid({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 5,
            margin_end: 5,
            column_spacing: 0,
            row_spacing: 0
        });

        let restoreDefaultsButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            vexpand: false,
            valign: Gtk.Align.CENTER,
            tooltip_text: _("Reset settings"),
            css_classes: ['destructive-action'],
            halign: Gtk.Align.END,
            hexpand: true,
        });
        restoreDefaultsButton.connect("clicked", () => {
            const pageName = title;
            let dialog = new Gtk.MessageDialog({
                text: "<b>" + _("Reset all %s settings?").format(pageName) + '</b>',
                secondary_text: _("All %s settings will be reset to the default value.").format(pageName),
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true
            });
            dialog.connect('response', (widget, response) => {
                if(response == Gtk.ResponseType.YES)
                    this.settingPage.restoreDefaults();
                dialog.destroy();
            });
            dialog.show();
        });

        let backButton = new PW.Button({
            icon_name: 'go-previous-symbolic',
            title: _("Back"),
            icon_first: true,
            css_classes: ['suggested-action']
        });
        backButton.halign = Gtk.Align.START;
        backButton.hexpand = true;

        backButton.connect('clicked', () => {
            mainLeaflet.visible_child_name = 'MainView';
        });

        let titleLabel = new Gtk.Label({
            label: _(title),
            halign: Gtk.Align.CENTER,
            hexpand: true,
            css_classes: ['title-4']
        });
        this.settingPage.titleLabel = titleLabel;

        buttonBox.attach(backButton, 0, 0, 1, 1);
        buttonBox.attach(titleLabel, 0, 0, 1, 1);

        if(this.settingPage.restoreDefaults)
            buttonBox.attach(restoreDefaultsButton, 0, 0, 1, 1);

            this.settingPage.prepend(buttonBox);

        const leafletPage = subLeaflet.append(this.settingPage);
        leafletPage.name = leafletName;

        this.connect('activated', () => {
            if(this.settingPage.setActiveLayout){
                this.settingPage.setActiveLayout(this._settings.get_enum('menu-layout'));
            }
            subLeaflet.visible_child = this.settingPage;
            mainLeaflet.visible_child = subLeaflet;
        });
    }
});

var MenuLayoutRow = GObject.registerClass(class ArcMenu_MenuLayout2Row extends Adw.ExpanderRow {
    _init(layout, params) {
        super._init({
            ...params
        });

        if(layout)
            this.layout = layout.MENU_TYPE;
    }
});

var LayoutsCategoryPage = GObject.registerClass({
    Signals: {
        'menu-layout-response': { param_types: [GObject.TYPE_INT] },
    },
},  class ArcMenu_LayoutsCategoryPage extends PW.IconGrid {
    _init(settings, parent, tile, title) {
        super._init();

        this._parent = parent;
        this._settings = settings;
        this.menuLayout = this._settings.get_enum('menu-layout');
        this.layoutStyle = tile.layout;

        const maxColumns = tile.layout.length > 3 ? 3 : tile.layout.length;
        this.styles = tile.layout;

        this.max_children_per_line = maxColumns;
        this.connect('child-activated', () => {
            const selectedChildren = this.get_selected_children();
            const selectedChild = selectedChildren[0];
            if(this.selectedChild && this.selectedChild !== selectedChild){
                this.selectedChild.setActive(false);
            }
            this.selectedChild = selectedChild;
            selectedChild.setActive(true);
            this.activeButton = selectedChild;
            this.menuLayout = selectedChild.layout;
            this.applyButton.set_sensitive(true);
        });



        this.styles.forEach((style) => {
            let tile = new PW.Tile(style.TITLE, style.IMAGE, style.LAYOUT);
            this.add(tile);
        });
    }

    clearSelection(){
        this.unselect_all();
        if(this.selectedChild)
            this.selectedChild.setActive(false);
        if(this.activeButton)
            this.activeButton.active = false;
    }
});