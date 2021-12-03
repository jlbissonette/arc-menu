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

const {Clutter, Gio, GLib, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            DisplayType: Constants.DisplayType.LIST,
            SearchDisplayType: Constants.DisplayType.GRID,
            GridColumns: 6,
            ColumnSpacing: 0,
            RowSpacing: 0,
            IconGridSize: 34,
            IconSize: 28,
            SearchResults_App_IconSize: 34,
            SearchResults_List_IconSize: 28,
            IconGridStyle: 'ElevenIconGrid',
            VerticalMainBox: true,
        });
    }

    createLayout(){
        super.createLayout();

        this.topBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.mainBox.add(this.subMainBox);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox.style = "margin: 5px 15px 10px 15px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);
        this.mainBox.insert_child_at_index(this.topBox, 0);

        this.applicationsBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            style: "padding-bottom: 10px;"
        });
        this.applicationsScrollBox = this._createScrollBox({
            clip_to_allocation: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'vfade',
        });   
        this.applicationsScrollBox.style = "width: 640px;";    
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);

        this.arcMenu.box.style = "padding-bottom:0px;";
        this.actionsContainerBoxStyle = "margin: 0px; spacing: 0px;background-color:rgba(186, 196,201, 0.1) ; padding: 12px 5px;"+
                                            "border-color:rgba(186, 196,201, 0.2) ; border-top-width: 1px;";
        this.themeNodeBorderRadius = "";
        this.actionsContainerBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.END,
            vertical: false,
            style: this.actionsContainerBoxStyle + this.themeNodeBorderRadius
        });

        this.subMainBox.add(this.actionsContainerBox);
        
        this.actionsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: false
        });
        this.actionsBox.style = "margin: 0px 25px; spacing: 10px;";
        this.appsBox = new St.BoxLayout({
            vertical: true
        });
        this.actionsContainerBox.add(this.actionsBox);

        this.shortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true,
            style: 'padding: 0px 25px;'
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: 10,
            row_spacing: 5,
            column_homogeneous: true
        });
        this.shortcutsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            layout_manager: layout 
        });
        layout.hookup_style(this.shortcutsGrid);
        this.shortcutsBox.add(this.shortcutsGrid);

        this.user = new MW.UserMenuItem(this);
        this.user.x_expand = true;
        this.user.x_align = Clutter.ActorAlign.FILL;
        this.user.style = "margin: 0px 75px 0px 0px;"
        this.actionsBox.add(this.user.actor);

        let path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
        if (path !== null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Downloads"));
            let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo, Constants.DisplayType.BUTTON);
            this.actionsBox.add_actor(placeMenuItem.actor);
        }

        path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path !== null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo, Constants.DisplayType.BUTTON);
            this.actionsBox.add_actor(placeMenuItem.actor);
        }

        let settingsButton = new MW.SettingsButton(this);
        this.actionsBox.add(settingsButton.actor);

        this.leaveButton = new MW.LeaveButton(this);
        this.actionsBox.add(this.leaveButton.actor);

        this.backButton = this._createNavigationButtons(_("All Apps"), MW.BackButton);
        this.allAppsButton = this._createNavigationButtons(_("Pinned"), MW.AllAppsButton);
        this.frequentAppsHeader = this._createNavigationButtons(_("Frequent"), null);

        this.loadPinnedApps();
        this.layoutProperties.DisplayType = Constants.DisplayType.LIST;
        this.loadCategories();
        this.setDefaultMenuView();

        this.disableFrequentAppsID = this._settings.connect("changed::eleven-disable-frequent-apps", () => this.setDefaultMenuView());
    }

    loadPinnedApps(){
        this.layoutProperties.DisplayType = Constants.DisplayType.GRID;
        super.loadPinnedApps();
    }

    loadFrequentApps(){
        this.frequentAppsList = [];

        if(this._settings.get_boolean("eleven-disable-frequent-apps"))
            return;

        let labelRow = this.createLabelRow(_("Frequent"));
        this.applicationsBox.add(labelRow);
        let mostUsed = Shell.AppUsage.get_default().get_most_used();

        if(mostUsed.length < 1)
            return;

        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i], Constants.DisplayType.LIST);
                this.frequentAppsList.push(item);
            }
        }

        const MaxItems = 8;
        if(this.frequentAppsList.length > MaxItems)
            this.frequentAppsList.splice(MaxItems);
    }
    
    setDefaultMenuView(){
        this.setGridLayout(Constants.DisplayType.GRID, 6, 0);
        super.setDefaultMenuView();
        this.loadFrequentApps();
        this.activeCategory = _("Pinned");
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
        this.displayPinnedApps();
    }

    _clearActorsFromBox(box){
        super._clearActorsFromBox(box);
    }

    displayAllApps(){
        this.activeCategory = _("All Apps");
        this.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS;
        
        this.setGridLayout(Constants.DisplayType.LIST, 1, 5);
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._clearActorsFromBox();
        this._displayAppList(appList, Constants.CategoryType.ALL_PROGRAMS, this.applicationsGrid);
        this.setGridLayout(Constants.DisplayType.GRID, 6, 0, false);
    }

    reload() {
        this.shortcutsBox.destroy_all_children();  
        super.reload();
    }

    updateStyle(){
        super.updateStyle();
        let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow'); 
       
        let themeNode = this.arcMenu.actor.get_theme_node();
        let borderRadius = themeNode.get_length('-arrow-border-radius');
        this.themeNodeBorderRadius = "border-radius: 0px 0px " + borderRadius + "px " + borderRadius + "px;";
        this.actionsContainerBox.style = this.actionsContainerBoxStyle + this.themeNodeBorderRadius;
        
        if(removeMenuArrow)
            this.arcMenu.box.style = "padding-bottom:0px; margin:0px;";
        else
            this.arcMenu.box.style = "padding-bottom:0px;";
    }

    setGridLayout(displayType, columns, spacing, setStyle = true){
        if(setStyle){
            this.applicationsGrid.x_align = displayType === Constants.DisplayType.LIST ? Clutter.ActorAlign.FILL : Clutter.ActorAlign.CENTER;
            displayType === Constants.DisplayType.LIST ? this.applicationsBox.add_style_class_name('margin-box') : this.applicationsBox.remove_style_class_name('margin-box');
        }
        this.applicationsGrid.layout_manager.column_spacing = spacing;
        this.applicationsGrid.layout_manager.row_spacing = spacing;
        this.layoutProperties.GridColumns = columns;
        this.layoutProperties.DisplayType = displayType;
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();
        this.hasPinnedApps = true;
        super.loadCategories();
    }

    displayPinnedApps() {
        this._clearActorsFromBox(this.applicationsBox);
        this.activeCategory = _("Pinned");
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);

        if(this.frequentAppsList.length > 0 && !this._settings.get_boolean("eleven-disable-frequent-apps")){
            this.activeCategory = _("Frequent");
            this.setGridLayout(Constants.DisplayType.GRID, 2, 0);
            this._displayAppList(this.frequentAppsList, Constants.CategoryType.HOME_SCREEN, this.shortcutsGrid);
            this.setGridLayout(Constants.DisplayType.GRID, 6, 0);
            if(!this.applicationsBox.contains(this.shortcutsBox))
                this.applicationsBox.add(this.shortcutsBox);
        }
        else if(this.applicationsBox.contains(this.shortcutsBox)){
            this.applicationsBox.remove_actor(this.shortcutsBox);
        }
    }

    _displayAppList(apps, category, grid){      
        super._displayAppList(apps, category, grid);

        this._hideNavigationButtons();
        
        if(category === Constants.CategoryType.PINNED_APPS){
            this.applicationsBox.insert_child_at_index(this.allAppsButton, 0);
        }
        else if(category === Constants.CategoryType.HOME_SCREEN){
            this.applicationsBox.insert_child_at_index(this.frequentAppsHeader, 2);
        }
        else if(category === Constants.CategoryType.ALL_PROGRAMS){
            this.mainBox.insert_child_at_index(this.backButton, 1);        
        }
    }

    _hideNavigationButtons(){
        if(this.mainBox.contains(this.backButton))
            this.mainBox.remove_actor(this.backButton);
    }

    _createNavigationButtons(buttonTitle, ButtonClass){
        let navButton = this.createLabelRow(buttonTitle);
        navButton.remove_actor(navButton._ornamentLabel);
        navButton.label.y_align = Clutter.ActorAlign.CENTER;
        navButton.label.style = 'padding: 15px 0px;';
        navButton.style = 'padding: 0px 25px;'
        if(ButtonClass)
            navButton.add(new ButtonClass(this));
        return navButton;
    }

    _onSearchBoxChanged(searchBox, searchString){
        this.applicationsBox.remove_style_class_name('margin-box');
        if(!searchBox.isEmpty())
            this._hideNavigationButtons();
        super._onSearchBoxChanged(searchBox, searchString);       
    }

    destroy(isReload){        
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;

        if(this.disableFrequentAppsID){
            this._settings.disconnect(this.disableFrequentAppsID);
            this.disableFrequentAppsID = null;
        }

        super.destroy(isReload);
    }
}
