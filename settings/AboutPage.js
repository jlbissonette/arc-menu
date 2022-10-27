const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Prefs = Me.imports.prefs;
const PW = Me.imports.prefsWidgets;
const _ = Gettext.gettext;

const PROJECT_TITLE = _('ArcMenu');
const PROJECT_DESCRIPTION = _('Application Menu Extension for GNOME');
const PROJECT_IMAGE = 'settings-arcmenu-logo';

const SCHEMA_PATH = '/org/gnome/shell/extensions/arcmenu/';
const GSET = 'gnome-shell-extension-tool';

var AboutPage = GObject.registerClass(
class extends Adw.PreferencesPage {
    _init(settings, preferencesWindow) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
            name: 'AboutPage'
        });
        this._settings = settings;

        //Project Logo, title, description-------------------------------------
        let projectHeaderGroup = new Adw.PreferencesGroup();
        let projectHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false
        });

        let projectImage = new Gtk.Image({
            margin_bottom: 5,
            icon_name: PROJECT_IMAGE,
            pixel_size: 100,
        });

        let projectTitleLabel = new Gtk.Label({
            label: PROJECT_TITLE,
            css_classes: ['title-1'],
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        let projectDescriptionLabel = new Gtk.Label({
            label: PROJECT_DESCRIPTION,
            hexpand: false,
            vexpand: false,
        });
        projectHeaderBox.append(projectImage);
        projectHeaderBox.append(projectTitleLabel);
        projectHeaderBox.append(projectDescriptionLabel);
        projectHeaderGroup.add(projectHeaderBox);

        this.add(projectHeaderGroup);
        //-----------------------------------------------------------------------

        //Extension/OS Info Group------------------------------------------------
        let infoGroup = new Adw.PreferencesGroup();

        let projectVersionRow = new Adw.ActionRow({
            title: `${PROJECT_TITLE} ${_('Version')}`,
        });
        projectVersionRow.add_suffix(new Gtk.Label({
            label: Me.metadata.version.toString()
        }));
        infoGroup.add(projectVersionRow);

        if(Me.metadata.commit){
            let commitRow = new Adw.ActionRow({
                title: _('Git Commit')
            });
            commitRow.add_suffix(new Gtk.Label({
                label: Me.metadata.commit.toString(),
            }));
            infoGroup.add(commitRow);
        }

        let gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: imports.misc.config.PACKAGE_VERSION.toString(),
        }));
        infoGroup.add(gnomeVersionRow);

        let osRow = new Adw.ActionRow({
            title: _('OS'),
        });

        let name = GLib.get_os_info("NAME");
        let prettyName = GLib.get_os_info("PRETTY_NAME");
        let buildID = GLib.get_os_info("BUILD_ID");
        let versionID = GLib.get_os_info("VERSION_ID");

        let osInfoText = prettyName ? prettyName : name;
        if(versionID)
            osInfoText += `; Version ID: ${versionID}`;
        if(buildID)
            osInfoText += `; Build ID: ${buildID}`;

        osRow.add_suffix(new Gtk.Label({
            label: osInfoText,
            single_line_mode: false,
            wrap: true,
        }));
        infoGroup.add(osRow);

        let sessionTypeRow = new Adw.ActionRow({
            title: _('Session Type'),
        });
        sessionTypeRow.add_suffix(new Gtk.Label({
            label: GLib.getenv('XDG_SESSION_TYPE') === "wayland" ? 'Wayland' : 'X11',
        }));
        infoGroup.add(sessionTypeRow);
        this.add(infoGroup);
        //-----------------------------------------------------------------------

        //Import/Export----------------------------------------------------------
        let importFrame = new Adw.PreferencesGroup({
            title: _('Export or Import Settings')
        });
        let importRow = new Adw.ActionRow({
            title: _("ArcMenu Settings")
        });
        let settingsImportInfoButton = new Gtk.Button({
            icon_name: 'help-about-symbolic',
            valign: Gtk.Align.CENTER
        });
        settingsImportInfoButton.connect('clicked', () => {
            let dialog = new Gtk.MessageDialog({
                text: "<b>" + _("Export or Import ArcMenu Settings") + '</b>',
                secondary_text:_('Importing will overwrite current settings.'),
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

        let importButton = new Gtk.Button({
            label: _("Import"),
            valign: Gtk.Align.CENTER
        });
        importButton.connect('clicked', () => {
            this._showFileChooser(
                _('Import settings'),
                { action: Gtk.FileChooserAction.OPEN },
                "_Open",
                filename => {
                    if (filename && GLib.file_test(filename, GLib.FileTest.EXISTS)) {
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

                        Prefs.populateWindow(preferencesWindow, this._settings);
                    }
                }
            );
        });
        let exportButton = new Gtk.Button({
            label: _("Export"),
            valign: Gtk.Align.CENTER
        });
        exportButton.connect('clicked', () => {
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
        //-----------------------------------------------------------------------

        //Credits----------------------------------------------------------------
        let creditsGroup = new Adw.PreferencesGroup({
            title: _("Credits")
        });
        this.add(creditsGroup);

        let creditsRow = new Adw.PreferencesRow({
            activatable: false,
            selectable: false
        });
        creditsGroup.add(creditsRow);

        let creditsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
        });
        creditsRow.set_child(creditsBox);

        let creditsCarousel = new Adw.Carousel({
            hexpand: true,
            halign: Gtk.Align.FILL,
            margin_top: 5,
            margin_bottom: 5
        });
        let creditsCarouselDots = new Adw.CarouselIndicatorDots({
            carousel: creditsCarousel,
        });
        creditsCarousel.append(new Gtk.Label({
            label: Constants.DEVELOPERS,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER
        }));
        creditsCarousel.append(new Gtk.Label({
            label: Constants.CONTRIBUTORS,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER
        }));
        creditsCarousel.append(new Gtk.Label({
            label: Constants.ARTWORK,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER
        }));
        creditsBox.append(creditsCarousel);
        creditsBox.append(creditsCarouselDots);
        //-----------------------------------------------------------------------

        let linksGroup = new Adw.PreferencesGroup();
        let linksBox = new Adw.ActionRow();

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/media/icons/prefs_icons/donate-icon.svg', -1, 50, true);
        let donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        let donateLinkButton = new Gtk.LinkButton({
            child: donateImage,
            uri: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=53CWA7NR743WC&item_name=Donate+to+support+my+work&currency_code=USD&source=url',
        });

        pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/media/icons/prefs_icons/gitlab-icon.svg', -1, 50, true);
        let gitlabImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        let projectUrl = Me.metadata.url;
        let projectLinkButton = new Gtk.LinkButton({
            child: gitlabImage,
            uri: projectUrl,
        });

        linksBox.add_prefix(projectLinkButton);
        linksBox.add_suffix(donateLinkButton);
        linksGroup.add(linksBox);
        this.add(linksGroup);

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
        });
        gnuSofwareLabelBox.append(gnuSofwareLabel);
        gnuSoftwareGroup.add(gnuSofwareLabelBox);
        this.add(gnuSoftwareGroup);
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
                    log('ArcMenu - Filechooser error: ' + e);
                }
            }
            dialog.destroy();
        });

        dialog.show();
    }
});
    