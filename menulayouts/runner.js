const Me = imports.misc.extensionUtils.getCurrentExtension();

const { Clutter, GObject, Shell, St } = imports.gi;
const { BaseMenuLayout } = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const _ = Gettext.gettext;

const padding = 10;

function getMenuLayoutEnum() { return Constants.MenuLayout.RUNNER; }

var Menu = class ArcMenu_RunnerLayout extends BaseMenuLayout {
    static {
        GObject.registerClass(this);
    }

    constructor(menuButton, isStandalone) {
        let display_type, search_display_type, column_spacing, row_spacing, default_menu_width, icon_grid_style;
        const searchDisplayStyle = Me.settings.get_enum('runner-search-display-style');

        if (searchDisplayStyle === Constants.DisplayType.LIST) {
            display_type = Constants.DisplayType.LIST;
            search_display_type = Constants.DisplayType.LIST;
            column_spacing = 0;
            row_spacing = 0;
            default_menu_width = null;
            icon_grid_style = null;
        }
        else {
            display_type = Constants.DisplayType.GRID;
            search_display_type = Constants.DisplayType.GRID;
            column_spacing = 15;
            row_spacing = 15;
            default_menu_width = Me.settings.get_int("runner-menu-width");
            icon_grid_style = "LargeIconGrid";
        }

        super(menuButton, {
            has_search: true,
            display_type,
            search_display_type,
            column_spacing,
            row_spacing,
            vertical: true,
            default_menu_width,
            icon_grid_style,
            category_icon_size: Constants.MEDIUM_ICON_SIZE,
            apps_icon_size: Constants.EXTRA_SMALL_ICON_SIZE,
            quicklinks_icon_size: Constants.EXTRA_SMALL_ICON_SIZE,
            buttons_icon_size: Constants.EXTRA_SMALL_ICON_SIZE,
            pinned_apps_icon_size: Constants.EXTRA_SMALL_ICON_SIZE,
            is_standalone_runner: isStandalone ? true : false
        });

        this.activeMenuItem = null;

        this.updateLocation();

        //store old ArcMenu variables
        this.oldSourceActor = this.arcMenu.sourceActor;
        this.oldFocusActor = this.arcMenu.focusActor;
        this.oldArrowAlignment = this.arcMenu.actor._arrowAlignment;

        this.arcMenu.sourceActor = Main.layoutManager.dummyCursor;
        this.arcMenu.focusActor = Main.layoutManager.dummyCursor;
        this.arcMenu._boxPointer.setPosition(Main.layoutManager.dummyCursor, 0.5);

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: false,
            style: `margin: ${padding}px ${padding}px 0px 0px; spacing: ${padding}px;`
        });
        this.runnerTweaksButton = new MW.RunnerTweaksButton(this);
        this.runnerTweaksButton.set({
            x_expand: false,
            y_expand: true,
            y_align: this.searchBox.y_align = Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
        });

        this.topBox.add_child(this.searchBox);
        this.topBox.add_child(this.runnerTweaksButton);
        this.add_child(this.topBox);

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.FILL,
            overlay_scrollbars: true,
            style_class: this._disableFadeEffect ? '' : 'small-vfade',
            reactive: true,
            style: `padding: ${padding}px 0px 0px 0px;`
        });

        this.add_child(this.applicationsScrollBox);
        this.applicationsBox = new St.BoxLayout({
            vertical: true,
            style: `padding: 0px ${padding}px 0px 0px;`
        });
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.setDefaultMenuView();
        this.updateWidth();
    }

    updateWidth(setDefaultMenuView){
        const width = Me.settings.get_int("runner-menu-width") - padding;
        this.menu_width = width;
        if(setDefaultMenuView)
            this.setDefaultMenuView();
    }

    setDefaultMenuView(){
        this.activeMenuItem = null;
        super.setDefaultMenuView();
        if(Me.settings.get_boolean("runner-show-frequent-apps"))
            this.displayFrequentApps();
    }

    displayFrequentApps(){
        const mostUsed = Shell.AppUsage.get_default().get_most_used();
        if(mostUsed.length < 1)
            return;

        const labelRow = this.createLabelRow(_("Frequent Apps"));
        this.applicationsBox.add_child(labelRow);

        const frequentAppsList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                const item = new MW.ApplicationMenuItem(this, mostUsed[i], Constants.DisplayType.LIST);
                frequentAppsList.push(item);
            }
        }
        let activeMenuItemSet = false;
        const maxApps = Math.min(10, frequentAppsList.length);
        for (let i = 0; i < maxApps; i++) {
            const item = frequentAppsList[i];
            if(item.get_parent())
                item.get_parent().remove_child(item);
            this.applicationsBox.add_actor(item);
            if(!activeMenuItemSet){
                activeMenuItemSet = true;
                this.activeMenuItem = item;
            }
        }
    }

    /**
     * if button is hidden, menu should appear on current monitor, unless preference is to always show on primary monitor
     * @returns index of monitor where menu should appear
     */
    _getMonitorIndexForPlacement() {
        if (this.is_standalone_runner) {
            return Me.settings.get_boolean('runner-hotkey-open-primary-monitor') ? Main.layoutManager.primaryMonitor.index : Main.layoutManager.currentMonitor.index;
        }
        else if (Me.settings.get_enum('menu-button-appearance') === Constants.MenuButtonAppearance.NONE)
            return Me.settings.get_boolean('hotkey-open-primary-monitor') ? Main.layoutManager.primaryMonitor.index : Main.layoutManager.currentMonitor.index;
        else
            return Main.layoutManager.findIndexForActor(this.menuButton);
    }

    updateLocation(){
        this.arcMenu._boxPointer.setSourceAlignment(0.5);
        this.arcMenu._arrowAlignment = 0.5;

        const runnerHeight = Me.settings.get_int("runner-menu-height");
        const runnerWidth = Me.settings.get_int("runner-menu-width");
        const runnerFontSize = Me.settings.get_int("runner-font-size");

        const rect = Main.layoutManager.getWorkAreaForMonitor(this._getMonitorIndexForPlacement());

        //Position the runner menu in the center of the current monitor, at top of screen.
        const positionX = Math.round(rect.x + (rect.width / 2));
        let positionY = rect.y;
        if(Me.settings.get_enum('runner-position') === 1)
            positionY = Math.round(rect.y + (rect.height / 2) - (runnerHeight / 2));
        Main.layoutManager.setDummyCursorGeometry(positionX, positionY, 0, 0);

        if(!this.topBox)
            return;

        this.style = `max-height: ${runnerHeight}px; margin: 0px 0px 0px ${padding}px; width: ${runnerWidth}px;`;
        if(runnerFontSize > 0){
            this.style += `font-size: ${runnerFontSize}pt;`
            this.searchBox.style += `font-size: ${runnerFontSize}pt;`
        }
        this.updateWidth();
    }

    loadCategories(){
    }

    destroy(){
        this.arcMenu.sourceActor = this.oldSourceActor;
        this.arcMenu.focusActor = this.oldFocusActor;
        this.arcMenu._boxPointer.setPosition(this.oldSourceActor, this.oldArrowAlignment);
        super.destroy();
    }
};
