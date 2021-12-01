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
            AppDisplayType: Constants.AppDisplayType.LIST,
            SearchDisplayType: Constants.AppDisplayType.GRID,
            GridColumns: 4,
            ColumnSpacing: 4,
            RowSpacing: 4,
            IconGridSize: 42,
            IconSize: 28,
            SearchResults_App_IconSize: 42,
            SearchResults_List_IconSize: 28,
            IconGridStyle: 'AZIconGrid',
            VerticalMainBox: true,
        });
    }

    createLayout(){
        super.createLayout();

        this.topBoxStyle = "margin: 0px 0px 10px 0px; spacing: 0px; background-color: rgba(186, 196,201, 0.1); padding: 11px 5px;"+
                            "border-color:rgba(186, 196,201, 0.2); border-bottom-width: 1px;";

        this.topBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false,
            style: this.topBoxStyle
        });
        this.arcMenu.box.style = "padding-bottom: 0px; padding-top: 0px; margin: 0px;";

        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.mainBox.add(this.subMainBox);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox.style = "margin: 5px 15px 5px 15px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);
        this.subMainBox.add(this.topBox);

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
        this.applicationsScrollBox.style = "width: 460px;";    
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);

        this.actionsContainerBoxStyle = "margin: 0px; spacing: 0px;background-color:rgba(186, 196,201, 0.1) ; padding: 12px 5px;"+
                                        "border-color:rgba(186, 196,201, 0.2) ; border-top-width: 1px;";
        
        this.actionsContainerBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.END,
            vertical: false,
            style: this.actionsContainerBoxStyle
        });

        this.subMainBox.add(this.actionsContainerBox);
        
        this.actionsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: false
        });
        this.actionsBox.style = "margin: 0px 15px; spacing: 10px;";
        this.appsBox = new St.BoxLayout({
            vertical: true
        });
        this.actionsContainerBox.add(this.actionsBox);

        this.user = new MW.UserMenuItem(this);
        this.user.x_expand = true;
        this.user.x_align = Clutter.ActorAlign.FILL;
        this.user.style = "margin: 0px 0px 0px 0px;"
        this.actionsBox.add(this.user.actor);


        let filesButton = new MW.ShortcutButtonItem(this, _("Files"), "system-file-manager", "org.gnome.Nautilus.desktop");
        if(filesButton.shouldShow)
            this.actionsBox.add_actor(filesButton.actor);

        let settingsButton = new MW.SettingsButton(this);
        settingsButton.actor.expand = false;
        settingsButton.actor.margin = 5;
        this.actionsBox.add(settingsButton.actor);

        this.leaveButton = new MW.LeaveButton(this);
        this.leaveButton.actor.expand = false;
        this.leaveButton.actor.margin = 5;
        this.actionsBox.add(this.leaveButton.actor);

        this.loadPinnedApps();
        this.layoutProperties.AppDisplayType = Constants.AppDisplayType.LIST;
        this.loadCategories();
        this.setDefaultMenuView();
    }


    loadPinnedApps(){
        this.layoutProperties.IconGridSize = 42;
        this.layoutProperties.AppDisplayType = Constants.AppDisplayType.GRID;
        super.loadPinnedApps();
    }
    
    setDefaultMenuView(){
        this.setGridLayout(Constants.AppDisplayType.GRID, 4, 4);
        super.setDefaultMenuView();
        this.activeCategory = _("Pinned");
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
        this.displayPinnedApps();
    }

    displayAllApps(){
        this.activeCategory = _("All Apps");
        this.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS;

        this.setGridLayout(Constants.AppDisplayType.LIST, 1, 3);
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._clearActorsFromBox();
        this._displayAppList(appList, Constants.CategoryType.ALL_PROGRAMS, this.applicationsGrid);
        this.setGridLayout(Constants.AppDisplayType.GRID, 4, 4, false);
    }

    reload() {
        super.reload();
    }

    updateStyle(){
        super.updateStyle();
       
        let themeNode = this.arcMenu.actor.get_theme_node();
        let borderRadius = themeNode.get_length('-arrow-border-radius');
        const RoundBottomBorder = "border-radius: 0px 0px " + borderRadius + "px " + borderRadius + "px;";
        const RoundTopBorder = "border-radius: " + borderRadius + "px " + borderRadius + "px 0px 0px;";
        this.actionsContainerBox.style = this.actionsContainerBoxStyle + RoundBottomBorder;
        this.topBox.style = this.topBoxStyle + RoundTopBorder;
        this.arcMenu.box.style = "padding-bottom: 0px; padding-top: 0px; margin: 0px;";
    }

    setGridLayout(appType, columns, spacing, setStyle = true){
        if(setStyle){
            this.applicationsGrid.x_align = appType === Constants.AppDisplayType.LIST ? Clutter.ActorAlign.FILL : Clutter.ActorAlign.CENTER;
            appType === Constants.AppDisplayType.LIST ? this.applicationsBox.add_style_class_name('margin-box') : this.applicationsBox.remove_style_class_name('margin-box');
        }

        this.applicationsGrid.layout_manager.column_spacing = spacing;
        this.applicationsGrid.layout_manager.row_spacing = spacing;
        this.layoutProperties.GridColumns = columns;
        this.layoutProperties.AppDisplayType = appType;
    }

    loadCategories() {
        this.layoutProperties.IconGridSize = 26;
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();
        this.hasPinnedApps = true;
        super.loadCategories();
    }

    displayPinnedApps() {
        this._clearActorsFromBox(this.applicationsBox);
        this.activeCategory = _("Pinned");
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);
    }

    _displayAppList(apps, category, grid){      
        super._displayAppList(apps, category, grid);

        this.headerLabel?.destroy();

        this.headerLabel = this.createLabelRow(this.activeCategory);
        this.headerLabel.remove_actor(this.headerLabel._ornamentLabel);
        this.headerLabel.label.y_align = Clutter.ActorAlign.CENTER;
        this.headerLabel.style = 'padding: 0px 15px 10px 15px;'
        this.subMainBox.insert_child_at_index(this.headerLabel, 1);

        if(category === Constants.CategoryType.PINNED_APPS){
            this.headerLabel.add(new MW.AllAppsButton(this));
        }
        else if(category === Constants.CategoryType.ALL_PROGRAMS){
            this.headerLabel.add(new MW.BackButton(this));     
        }      
    }

    _onSearchBoxChanged(searchBox, searchString){
        this.applicationsBox.remove_style_class_name('margin-box');
        if(!searchBox.isEmpty()){
            if(this.headerLabel && this.subMainBox.contains(this.headerLabel)){
                this.subMainBox.remove_actor(this.headerLabel);
            }
        }
        super._onSearchBoxChanged(searchBox, searchString);       
    }

    destroy(isReload){        
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;

        super.destroy(isReload);
    }
}
