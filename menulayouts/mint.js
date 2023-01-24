const Me = imports.misc.extensionUtils.getCurrentExtension();

const { Clutter, GLib, Gio, Gtk, Shell, St } = imports.gi;
const appSys = Shell.AppSystem.get_default();
const { BaseMenuLayout } = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

function getMenuLayoutEnum() { return Constants.MenuLayout.MINT; }

var Menu = class extends BaseMenuLayout{
    constructor(menuButton) {
        super(menuButton, {
            Search: true,
            DualPanelMenu: true,
            DisplayType: Constants.DisplayType.LIST,
            SearchDisplayType: Constants.DisplayType.LIST,
            ShortcutContextMenuLocation: Constants.ContextMenuLocation.RIGHT,
            ColumnSpacing: 0,
            RowSpacing: 0,
            SupportsCategoryOnHover: true,
            VerticalMainBox: false,
            DefaultCategoryIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultApplicationIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultButtonsIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }
    createLayout(){
        super.createLayout();
        //Stores the Pinned Icons on the left side
        this.actionsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            overlay_scrollbars: true,
            style_class: 'small-vfade'
        });
        this.actionsScrollBox.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);
        this.actionsBox = new St.BoxLayout({
            vertical: true,
        });
        this.actionsScrollBox.add_actor(this.actionsBox);
        this.actionsScrollBox.clip_to_allocation = true;

        this.actionsScrollBox.style = "padding: 10px 0px; width: 62px; margin: 0px 8px 0px 0px; background-color:rgba(10, 10, 15, 0.1); border-color:rgba(186, 196,201, 0.2); border-width: 1px; border-radius: 8px;";
        this.actionsBox.style = "spacing: 10px;";

        this.mainBox.add_child(this.actionsScrollBox);
        this.rightMenuBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.mainBox.add_child(this.rightMenuBox);

        this.searchBox.style = "margin: 0px;";
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.add_style_class_name('arcmenu-search-top');
            this.rightMenuBox.add_child(this.searchBox);

            let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MAX, Constants.SeparatorAlignment.HORIZONTAL);
            this.rightMenuBox.add_child(separator);
        }

        //Sub Main Box -- stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
        });
        this.rightMenuBox.add_child(this.subMainBox);

        this.rightBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
        });

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: (this.disableFadeEffect ? '' : 'small-vfade'),
        });

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add_child(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
        });

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add_child(horizonalFlip ? this.rightBox : this.leftBox);
        let verticalSeparator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.VERTICAL);
        this.subMainBox.add_child(verticalSeparator);
        this.subMainBox.add_child(horizonalFlip ? this.leftBox : this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            style_class: (this.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true
        });

        this.leftBox.add_child(this.categoriesScrollBox);
        this.categoriesBox = new St.BoxLayout({ vertical: true });

        this.categoriesScrollBox.add_actor( this.categoriesBox);
        this.categoriesScrollBox.clip_to_allocation = true;
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.BOTTOM){
            let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MAX, Constants.SeparatorAlignment.HORIZONTAL);
            this.rightMenuBox.add_child(separator);

            this.searchBox.add_style_class_name('arcmenu-search-bottom');
            this.rightMenuBox.add_child(this.searchBox);
        }

        this._extraButtonsChangedId = this._settings.connect('changed::mint-extra-buttons', () => this._createExtraButtons());
        this._createExtraButtons();

        this.updateWidth();
        this.loadCategories();
        this.loadPinnedApps();
        this.setDefaultMenuView();
    }

    _createExtraButtons() {
        this.actionsBox.destroy_all_children();
        const extraButtons = this._settings.get_value('mint-extra-buttons').deep_unpack();

        if (extraButtons.length === 0)
            return;

        const isContainedInCategory = false;

        for (let i = 0; i < extraButtons.length; i++) {
            const command = extraButtons[i][2];
            if (command === Constants.ShortcutCommands.SEPARATOR) {
                let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
                this.actionsBox.add_child(separator);
            }
            else {
                let item = this.createMenuItem(extraButtons[i], Constants.DisplayType.BUTTON, isContainedInCategory);
                if(item.shouldShow)
                    this.actionsBox.add_child(item);
            }
        }
    }

    updateWidth(setDefaultMenuView){
        let leftPanelWidthOffset = 0;
        let rightPanelWidthOffset = 45;
        super.updateWidth(setDefaultMenuView, leftPanelWidthOffset, rightPanelWidthOffset);
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayCategories();

        let topCategory = this.categoryDirectories.values().next().value;
        topCategory.displayAppList();
        this.setActiveCategory(topCategory);
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum, Constants.DisplayType.LIST);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories();
    }

    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
