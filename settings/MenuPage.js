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
            spacing: 24,
            margin_start: 6,
            margin_end: 6,
            margin_bottom: 6,
            css_name: 'box'
        });

        this.mainLeaflet = new Adw.Leaflet({
            homogeneous: false,
            transition_type: Adw.LeafletTransitionType.SLIDE,
            can_navigate_back: true,
            can_navigate_forward: false,
            can_unfold: false,
        });
        let leafletPage = this.mainLeaflet.append(mainBox);
        leafletPage.name = "MainView";
        mainGroup.add(this.mainLeaflet);

        this.subLeaflet = new Adw.Leaflet({
            homogeneous: false,
            transition_type: Adw.LeafletTransitionType.SLIDE,
            can_navigate_back: false,
            can_navigate_forward: false,
            can_unfold: false,
        });
        leafletPage = this.mainLeaflet.append(this.subLeaflet);
        leafletPage.name = "SubView";

        let menuLooksGroup = new Adw.PreferencesGroup({
            title: _("How should the menu look?"),
        });
        mainBox.append(menuLooksGroup);

        let layoutRow = new SettingRow({
            title: _('Menu Layout'),
            subtitle: _('Choose the style of the menu'),
            icon_name: 'settings-layouts-symbolic'
        });
        this._addLeafletPageToRow(layoutRow, {
            pageClass: LayoutsPage,
            leaftletName: 'LayoutsPage',
            leaftletTitle: _('Current Menu Layout'),
        });
        layoutRow.settingPage.connect('response', (_w, response) => {
            if(response === Gtk.ResponseType.APPLY)
                tweaksRow.title = _(SettingsUtils.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')));
        });
        menuLooksGroup.add(layoutRow);

        let themeRow = new SettingRow({
            title: _('Menu Theme'),
            subtitle: _('Modify colors, font size, and border of the menu'),
            icon_name: 'settings-theme-symbolic'
        });
        this._addLeafletPageToRow(themeRow, {
            pageClass: ThemePage,
            leaftletName: 'ThemePage',
        });
        menuLooksGroup.add(themeRow);

        let visualSettingsRow = new SettingRow({
            title: _('Menu Visual Appearance'),
            subtitle: _('Change menu height and width, menu location, and menu icon sizes'),
            icon_name: 'settings-settings-symbolic'
        });
        this._addLeafletPageToRow(visualSettingsRow, {
            pageClass: VisualSettingsPage,
            leaftletName: 'VisualSettingsPage',
        });
        menuLooksGroup.add(visualSettingsRow);

        let fineTuneRow = new SettingRow({
            title: _('Fine Tune'),
            subtitle: _('Adjust less commonly used visual settings'),
            icon_name: 'settings-finetune-symbolic'
        });
        this._addLeafletPageToRow(fineTuneRow, {
            pageClass: FineTunePage,
            leaftletName: 'FineTunePage',
        });
        menuLooksGroup.add(fineTuneRow);

        let whatToShowGroup = new Adw.PreferencesGroup({
            title: _("What should show on the menu?"),
        });
        mainBox.append(whatToShowGroup);

        let tweaksRow = new SettingRow({
            title: _(SettingsUtils.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout'))),
            subtitle: _('Settings specific to the current menu layout'),
            icon_name: 'emblem-system-symbolic'
        });
        this._addLeafletPageToRow(tweaksRow, {
            pageClass: LayoutTweaksPage,
            leaftletName: 'LayoutTweaksPage',
            leaftletTitle: SettingsUtils.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')),
        });
        whatToShowGroup.add(tweaksRow);

        let pinnedAppsRow = new SettingRow({
            title: _('Pinned Apps'),
            icon_name: 'view-pin-symbolic'
        });
        this._addLeafletPageToRow(pinnedAppsRow, {
            pageClass: ListPinnedPage,
            pageClassParams: Constants.MenuSettingsListType.PINNED_APPS,
            leaftletName: 'PinnedAppsPage',
        });
        whatToShowGroup.add(pinnedAppsRow);

        let directoryShortcutsRow = new SettingRow({
            title: _('Directory Shortcuts'),
            icon_name: 'folder-symbolic'
        });
        this._addLeafletPageToRow(directoryShortcutsRow, {
            pageClass: ListPinnedPage,
            pageClassParams: Constants.MenuSettingsListType.DIRECTORIES,
            leaftletName: 'DirectoryShortcutsPage',
        });
        whatToShowGroup.add(directoryShortcutsRow);

        let applicationShortcutsRow = new SettingRow({
            title: _('Application Shortcuts'),
            icon_name: 'view-grid-symbolic'
        });
        this._addLeafletPageToRow(applicationShortcutsRow, {
            pageClass: ListPinnedPage,
            pageClassParams: Constants.MenuSettingsListType.APPLICATIONS,
            leaftletName: 'ApplicationShortcutsPage',
        });
        whatToShowGroup.add(applicationShortcutsRow);

        let searchOptionsRow = new SettingRow({
            title: _('Search Options'),
            icon_name: 'preferences-system-search-symbolic'
        });
        this._addLeafletPageToRow(searchOptionsRow, {
            pageClass: SearchOptionsPage,
            leaftletName: 'SearchOptionsPage',
        });
        whatToShowGroup.add(searchOptionsRow);

        let powerOptionsRow = new SettingRow({
            title: _('Power Options'),
            subtitle: _('Which power options to show and display style'),
            icon_name: 'gnome-power-manager-symbolic'
        });
        this._addLeafletPageToRow(powerOptionsRow, {
            pageClass: ListOtherPage,
            pageClassParams: Constants.MenuSettingsListType.POWER_OPTIONS,
            leaftletName: 'PowerOptionsPage',
        });
        whatToShowGroup.add(powerOptionsRow);

        let extraCategoriesRow = new SettingRow({
            title: _('Extra Categories'),
            icon_name: 'view-list-symbolic',
            subtitle: _('Add or Remove additional custom categories')
        });
        this._addLeafletPageToRow(extraCategoriesRow, {
            pageClass: ListOtherPage,
            pageClassParams: Constants.MenuSettingsListType.EXTRA_CATEGORIES,
            leaftletName: 'ExtraCategoriesPage',
        });
        whatToShowGroup.add(extraCategoriesRow);
    }

    _addLeafletPageToRow(row, pageParams){
        const leafletName = pageParams.leaftletName;
        const leafletTitle = pageParams.leaftletTitle ?? row.title;
        const PageClass = pageParams.pageClass;
        const pageClassParams = pageParams.pageClassParams;

        const settingPage = new PageClass(this._settings, pageClassParams);
        row.settingPage = settingPage;

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
            let dialog = new Gtk.MessageDialog({
                text: "<b>" + _("Reset all %s settings?").format(leafletTitle) + '</b>',
                secondary_text: _("All %s settings will be reset to the default value.").format(leafletTitle),
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true
            });
            dialog.connect('response', (widget, response) => {
                if(response == Gtk.ResponseType.YES)
                    settingPage.restoreDefaults();
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
            this.mainLeaflet.visible_child_name = 'MainView';
        });

        let titleLabel = new Gtk.Label({
            label: _(leafletTitle),
            halign: Gtk.Align.CENTER,
            hexpand: true,
            css_classes: ['title-4']
        });
        settingPage.titleLabel = titleLabel;

        buttonBox.attach(backButton, 0, 0, 1, 1);
        buttonBox.attach(titleLabel, 0, 0, 1, 1);

        if(settingPage.restoreDefaults)
            buttonBox.attach(restoreDefaultsButton, 0, 0, 1, 1);

        settingPage.prepend(buttonBox);

        const leafletPage = this.subLeaflet.append(settingPage);
        leafletPage.name = leafletName;

        row.connect('activated', () => {
            if(settingPage.setActiveLayout)
                settingPage.setActiveLayout(this._settings.get_enum('menu-layout'));

            this.subLeaflet.visible_child = settingPage;
            this.mainLeaflet.visible_child = this.subLeaflet;
        });
    }
});

var SettingRow = GObject.registerClass(class ArcMenu_MenuLayoutRow extends Adw.ActionRow {
    _init(params) {
        super._init({
            activatable: true,
            ...params
        });

        let goNextImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        });

        this.add_suffix(goNextImage);
    }
});