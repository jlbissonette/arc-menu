const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gio, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const { LayoutTweaksPage } = Me.imports.settings.Menu.LayoutTweaksPage;
const PW = Me.imports.prefsWidgets;
const _ = Gettext.gettext;

var LayoutsPage = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT]},
    },
},
class ArcMenu_LayoutsPage extends Gtk.Box {
    _init(settings) {
        super._init({
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this._settings = settings;

        let mainGroup = new Adw.PreferencesGroup();
        this.append(mainGroup);

        let mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        mainGroup.add(mainBox);

        let currentLayoutGroup = new Adw.PreferencesGroup();
        let currentLayoutName = this.getMenuLayoutName(this._settings.get_enum('menu-layout'));
        let currentLayoutImagePath = this.getMenuLayoutImagePath(this._settings.get_enum('menu-layout'));

        let currentLayoutBoxRow = new CurrentLayoutRow(currentLayoutName, currentLayoutImagePath);

        currentLayoutGroup.add(currentLayoutBoxRow);
        mainBox.append(currentLayoutGroup);

        this.applyButton = new Gtk.Button({
            label: _("Apply"),
            hexpand: false,
            halign: Gtk.Align.END,
            css_classes: ['suggested-action'],
            sensitive: false
        });

        this.applyButton.connect('clicked', () => {
            this._settings.set_enum('menu-layout', this.selectedMenuLayout);
            currentLayoutBoxRow.label.label = this.getMenuLayoutName(this.selectedMenuLayout);
            currentLayoutBoxRow.image.gicon = Gio.icon_new_for_string(this.getMenuLayoutImagePath(this.selectedMenuLayout));
            this.applyButton.sensitive = true;
            this.expandedRow.expanded = false;
            this.emit('response', Gtk.ResponseType.APPLY)
        });

        let menuLayoutGroup = new Adw.PreferencesGroup({
            title: _("Choose a new menu layout?"),
            header_suffix: this.applyButton
        });
        mainBox.append(menuLayoutGroup);

        Constants.MenuStyles.STYLES.forEach((style) => {

            let tile = new Adw.ExpanderRow({
                title: _("%s Menu Layouts").format(_(style.TITLE)),
                icon_name: style.IMAGE
            });
            tile.layout = style.MENU_TYPE;
         
            menuLayoutGroup.add(tile);

            let menuLayoutsBox = new LayoutsCategoryPage(this._settings, tile);
            let row = new Gtk.ListBoxRow({
                selectable: false,
                activatable: false,
            });
            row.set_child(menuLayoutsBox);
            menuLayoutsBox.connect('menu-selected', (dialog, response) => {
                if(response === Gtk.ResponseType.OK) {
                    this.applyButton.sensitive = true;
                    this.selectedMenuLayout = dialog.menuLayout;
                }
            });
            tile.connect('notify::expanded', () => {
                if(this.expandedRow && this.expandedRow !== tile)
                    this.expandedRow.expanded = false;

                this.expandedRow = tile;

                if(!tile.expanded){
                    menuLayoutsBox.clearSelection();
                    this.applyButton.sensitive = false;
                }
            });
            tile.add_row(row);
        });
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
                    return _("%s Layout Tweaks").format(_(style.TITLE));
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

var LayoutsCategoryPage = GObject.registerClass({
    Signals: {
        'menu-selected': { param_types: [GObject.TYPE_INT] },
    },
},  class ArcMenu_LayoutsCategoryPage extends PW.IconGrid {
    _init(settings, tile) {
        super._init();

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
            this.menuLayout = selectedChild.layout;

            this.emit('menu-selected', Gtk.ResponseType.OK);
        });

        this.styles.forEach((style) => {
            let tile = new PW.MenuLayoutTile(style.TITLE, style.IMAGE, style.LAYOUT);
            this.add(tile);
        });
    }

    clearSelection(){
        this.unselect_all();
        if(this.selectedChild)
            this.selectedChild.setActive(false);
    }
});

var CurrentLayoutRow = GObject.registerClass(class ArcMenu_MenuLayoutRow extends Gtk.Box {
    _init(title, imagePath, layout) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            css_classes: ['card'],
            hexpand: false,
            spacing: 0,
            halign: Gtk.Align.CENTER,
        });

        if(layout)
            this.layout = layout.MENU_TYPE;
        
        let box = new Gtk.Box({
            margin_start: 15,
            margin_end: 15,
            margin_top: 5,
            margin_bottom: 5,
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
        });
    
        this.image = new Gtk.Image({
            hexpand: false,
            halign: Gtk.Align.CENTER,
            gicon: Gio.icon_new_for_string(imagePath),
            pixel_size: 125
        });

        this.label = new Gtk.Label({
            label: _(title),
            hexpand: true,
            halign: Gtk.Align.CENTER,
            vexpand: false,
            valign: Gtk.Align.START,
            css_classes: ['heading'],
        });

        box.append(this.image);
        box.append(this.label);

        this.append(box);
    }
});