#nullable disable
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ScanNasClient
{
    // ── CONFIGURATION DEPUIS scan_nas.cfg ────────────────────────────────────
    // Nouvelle structure : eds_list et cellules_list (plus de server_url)
    public class AppConfig
    {
        public List<string> eds_list { get; set; } = new List<string>();
        public List<string> cellules_list { get; set; } = new List<string>();
    }

    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            ApplicationConfiguration.Initialize();

            // Lecture du fichier scan_nas.cfg situé à côté du .exe (ou dans le dossier courant)
            var config = new AppConfig();
            string[] candidats = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "scan_nas.cfg"),
                Path.Combine(Directory.GetCurrentDirectory(), "scan_nas.cfg")
            };
            foreach (string cheminCfg in candidats)
            {
                if (File.Exists(cheminCfg))
                {
                    try
                    {
                        string json = File.ReadAllText(cheminCfg, Encoding.UTF8);
                        var cfg = JsonSerializer.Deserialize<AppConfig>(json);
                        if (cfg != null)
                        {
                            config = cfg;
                        }
                        break;
                    }
                    catch { /* Fichier corrompu : on utilise les listes vides par défaut */ }
                }
            }

            Application.Run(new MainForm(config));
        }
    }

    public class FileMetadata
    {
        public string id { get; set; } = "";
        public string nom_fichier { get; set; } = "";
        public string chemin_complet { get; set; } = "";
        public string dossier_parent { get; set; } = "";
        public long taille { get; set; }
        public string taille_lisible { get; set; } = "";
        public string extension { get; set; } = "";
        public string date_modification { get; set; } = "";
        public string date_creation { get; set; } = "";
        public bool est_vide { get; set; }
    }

    public class ScanPayload
    {
        public string nas { get; set; } = "";
        public string label { get; set; } = "";
        public string scanned_root_path { get; set; } = "";
        public string outil_source { get; set; } = "exe";
        public bool is_first_chunk { get; set; }
        public bool is_last_chunk { get; set; }
        public List<FileMetadata> files { get; set; } = new List<FileMetadata>();
    }

    public static class GraphicsUtils
    {
        public static GraphicsPath GetRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            if (radius <= 0)
            {
                path.AddRectangle(rect);
                return path;
            }
            int diameter = radius * 2;
            Rectangle arc = new Rectangle(rect.X, rect.Y, diameter, diameter);

            path.AddArc(arc, 180, 90);
            arc.X = rect.Right - diameter;
            path.AddArc(arc, 270, 90);
            arc.Y = rect.Bottom - diameter;
            path.AddArc(arc, 0, 90);
            arc.X = rect.X;
            path.AddArc(arc, 90, 90);

            path.CloseFigure();
            return path;
        }
    }

    // ── CHAMP DE SAISIE MODERNE AVEC COINS ARRONDIS & EFFET FOCUS GLOW ───────────
    public class ModernTextBox : Panel
    {
        private TextBox innerTextBox;
        public int BorderRadius { get; set; } = 8;
        public Color NormalBorderColor { get; set; } = Color.FromArgb(51, 65, 85);  // #334155
        public Color FocusBorderColor { get; set; } = Color.FromArgb(99, 102, 241);  // #6366F1 Indigo glow
        public Color FillColor { get; set; } = Color.FromArgb(15, 23, 42);          // #0F172A

        private bool isFocused = false;

        public event EventHandler InnerTextBoxLeave
        {
            add => innerTextBox.Leave += value;
            remove => innerTextBox.Leave -= value;
        }

        public override string Text
        {
            get => innerTextBox?.Text ?? "";
            set { if (innerTextBox != null) innerTextBox.Text = value; }
        }

        public bool ReadOnly
        {
            get => innerTextBox?.ReadOnly ?? false;
            set
            {
                if (innerTextBox != null)
                {
                    innerTextBox.ReadOnly = value;
                    innerTextBox.BackColor = FillColor;
                }
            }
        }

        public ModernTextBox()
        {
            SetStyle(ControlStyles.ResizeRedraw | ControlStyles.OptimizedDoubleBuffer | ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint, true);
            DoubleBuffered = true;
            Height = 34;
            BackColor = Color.Transparent;
            Padding = new Padding(10, 7, 10, 7);

            innerTextBox = new TextBox
            {
                BorderStyle = BorderStyle.None,
                BackColor = FillColor,
                ForeColor = Color.FromArgb(248, 250, 252),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Dock = DockStyle.Fill
            };

            innerTextBox.GotFocus += (s, e) => { isFocused = true; Invalidate(); };
            innerTextBox.LostFocus += (s, e) => { isFocused = false; Invalidate(); };
            this.Click += (s, e) => innerTextBox.Focus();

            Controls.Add(innerTextBox);
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using var path = GraphicsUtils.GetRoundedPath(rect, BorderRadius);

            using var brush = new SolidBrush(FillColor);
            e.Graphics.FillPath(brush, path);

            Color currentBorder = isFocused ? FocusBorderColor : NormalBorderColor;
            float borderWidth = isFocused ? 1.6f : 1.1f;
            using var pen = new Pen(currentBorder, borderWidth);
            e.Graphics.DrawPath(pen, path);
        }
    }

    public class RoundedCardPanel : Panel
    {
        public int BorderRadius { get; set; } = 14;
        public Color BorderColor { get; set; } = Color.FromArgb(45, 58, 82);
        public Color FillColor { get; set; } = Color.FromArgb(23, 32, 51);

        public RoundedCardPanel()
        {
            SetStyle(ControlStyles.ResizeRedraw | ControlStyles.OptimizedDoubleBuffer | ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint, true);
            DoubleBuffered = true;
            BackColor = Color.Transparent;
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using var path = GraphicsUtils.GetRoundedPath(rect, BorderRadius);

            using var brush = new SolidBrush(FillColor);
            e.Graphics.FillPath(brush, path);

            using var pen = new Pen(BorderColor, 1.2f);
            e.Graphics.DrawPath(pen, path);
        }
    }

    public class RoundedButton : Button
    {
        public int BorderRadius { get; set; } = 10;
        public new Color DefaultBackColor { get; set; } = Color.FromArgb(79, 70, 229);
        public Color HoverBackColor { get; set; } = Color.FromArgb(99, 102, 241);
        public Color DisabledBackColor { get; set; } = Color.FromArgb(45, 55, 72);
        public Color BorderColor { get; set; } = Color.Transparent;

        private bool isHovered = false;

        public RoundedButton()
        {
            SetStyle(ControlStyles.ResizeRedraw | ControlStyles.OptimizedDoubleBuffer | ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint, true);
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            DoubleBuffered = true;
            Cursor = Cursors.Hand;
            BackColor = Color.Transparent;
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            Invalidate();
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            isHovered = true;
            Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            isHovered = false;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs pevent)
        {
            pevent.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            pevent.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using var path = GraphicsUtils.GetRoundedPath(rect, BorderRadius);

            Color currentBg = !Enabled ? DisabledBackColor : (isHovered ? HoverBackColor : DefaultBackColor);
            using var brush = new SolidBrush(currentBg);
            pevent.Graphics.FillPath(brush, path);

            if (BorderColor != Color.Transparent)
            {
                using var pen = new Pen(BorderColor, 1.2f);
                pevent.Graphics.DrawPath(pen, path);
            }

            Color currentFg = !Enabled ? Color.FromArgb(156, 163, 175) : ForeColor;
            TextRenderer.DrawText(
                pevent.Graphics,
                Text,
                Font,
                rect,
                currentFg,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter
            );
        }
    }

    public partial class MainForm : Form
    {
        private static readonly Color BgDark = Color.FromArgb(11, 15, 25);
        private static readonly Color TextPrimary = Color.FromArgb(248, 250, 252);
        private static readonly Color TextMuted = Color.FromArgb(148, 163, 184);
        private static readonly Color AccentIndigo = Color.FromArgb(59, 130, 246);

        private ModernTextBox txtNasCode;
        private ModernTextBox txtCelluleLabel;
        private ModernTextBox txtSelectedFolder;
        private RoundedButton btnDropdownEds;
        private RoundedButton btnDropdownCellule;
        private RoundedButton btnBrowse;
        private RoundedButton btnStartScan;
        private ProgressBar progressBar;
        private Label lblStatus;
        private RichTextBox txtLog;

        // Listes alimentées depuis scan_nas.cfg
        private List<string> _listeEds = new List<string>();
        private List<string> _listeCellules = new List<string>();

        public MainForm(AppConfig config)
        {
            _listeEds = (config.eds_list ?? new List<string>())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .OrderBy(s => s)
                .ToList();
            _listeCellules = (config.cellules_list ?? new List<string>())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .OrderBy(s => s)
                .ToList();

            Text = "Catalogue NAS - Scanner Local";
            Width = 760;
            Height = 680;
            MinimumSize = new Size(740, 600);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.Sizable;
            MaximizeBox = true;
            BackColor = BgDark;
            ForeColor = TextPrimary;
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            InitializeHeader();
            InitializeControls();
        }

        private void InitializeHeader()
        {
            var pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 65,
                BackColor = Color.FromArgb(15, 23, 42)
            };

            var lblTitle = new Label
            {
                Text = "⚡ CATALOGUE DE FICHIERS",
                Font = new Font("Segoe UI", 12.5f, FontStyle.Bold),
                ForeColor = TextPrimary,
                Left = 20,
                Top = 19,
                AutoSize = true
            };

            // Indicateur mode export JSON (remplace "Connecté")
            var lblMode = new Label
            {
                Text = "📄 Mode Export JSON",
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                ForeColor = Color.FromArgb(52, 211, 153),
                Left = 580,
                Top = 22,
                AutoSize = true,
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };

            pnlHeader.Controls.Add(lblTitle);
            pnlHeader.Controls.Add(lblMode);

            var lineHeader = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 1,
                BackColor = Color.FromArgb(30, 41, 59)
            };
            pnlHeader.Controls.Add(lineHeader);

            Controls.Add(pnlHeader);
        }

        private void InitializeControls()
        {
            int currentY = 80;

            // ── CARD 1 : PARAMÈTRES DU SCANNER (2 lignes : EDS + Cellule) ──────
            var cardConfig = new RoundedCardPanel
            {
                Left = 20, Top = currentY, Width = 704,
                Height = 160,   // 2 lignes : EDS + Cellule
                BorderRadius = 14,
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            cardConfig.Controls.Add(new Label
            {
                Text = "PARAMÈTRES DU SCANNER",
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                ForeColor = Color.FromArgb(129, 140, 248),
                Left = 18, Top = 12, AutoSize = true
            });

            int yInside = 42;

            // ─ EDS / Espace de stockage ──────────────────────────────────
            cardConfig.Controls.Add(new Label { Text = "Espace de stockage", Left = 18, Top = yInside + 8, Width = 148, ForeColor = TextMuted, Font = new Font("Segoe UI", 9f), AutoSize = false });

            txtNasCode = new ModernTextBox { Text = "", Left = 172, Top = yInside, Width = 488, Height = 34, Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right };
            txtNasCode.InnerTextBoxLeave += (s, e) => _ActualiserBoutonScan();
            cardConfig.Controls.Add(txtNasCode);

            btnDropdownEds = new RoundedButton
            {
                Text = "▼",
                Left = 664, Top = yInside, Width = 22, Height = 34,
                BorderRadius = 6,
                DefaultBackColor = Color.FromArgb(30, 41, 59),
                HoverBackColor = Color.FromArgb(51, 65, 85),
                BorderColor = Color.FromArgb(71, 85, 105),
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 7f),
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            btnDropdownEds.Click += (s, e) => ShowDropdownEds(btnDropdownEds);
            cardConfig.Controls.Add(btnDropdownEds);
            yInside += 50;

            // ─ Cellule ──────────────────────────────────────────────────
            cardConfig.Controls.Add(new Label { Text = "Cellule", Left = 18, Top = yInside + 8, Width = 148, ForeColor = TextMuted, Font = new Font("Segoe UI", 9f), AutoSize = false });

            txtCelluleLabel = new ModernTextBox { Text = "", Left = 172, Top = yInside, Width = 488, Height = 34, Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right };
            txtCelluleLabel.InnerTextBoxLeave += (s, e) => _ActualiserBoutonScan();
            cardConfig.Controls.Add(txtCelluleLabel);

            btnDropdownCellule = new RoundedButton
            {
                Text = "▼",
                Left = 664, Top = yInside, Width = 22, Height = 34,
                BorderRadius = 6,
                DefaultBackColor = Color.FromArgb(30, 41, 59),
                HoverBackColor = Color.FromArgb(51, 65, 85),
                BorderColor = Color.FromArgb(71, 85, 105),
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 7f),
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            btnDropdownCellule.Click += (s, e) => ShowDropdownCellule(btnDropdownCellule);
            cardConfig.Controls.Add(btnDropdownCellule);

            Controls.Add(cardConfig);
            currentY += 175;

            // ── CARD 2 : PÉRIMÈTRE ────────────────────────────────────────────
            var cardScope = new RoundedCardPanel
            {
                Left = 20,
                Top = currentY,
                Width = 704,
                Height = 100,
                BorderRadius = 14,
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            var lblSection2 = new Label
            {
                Text = "DOSSIER À SCANNER",
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                ForeColor = Color.FromArgb(129, 140, 248),
                Left = 18,
                Top = 12,
                AutoSize = true
            };
            cardScope.Controls.Add(lblSection2);

            yInside = 42;

            // Dossier à scanner
            var lblFolder = new Label { Text = "Dossier cible", Left = 18, Top = yInside + 7, ForeColor = TextMuted, AutoSize = true };
            txtSelectedFolder = new ModernTextBox { Text = "", Left = 130, Top = yInside, Width = 420, Height = 34, ReadOnly = true, Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right };

            btnBrowse = new RoundedButton
            {
                Text = "Parcourir...",
                Left = 560,
                Top = yInside,
                Width = 120,
                Height = 34,
                BorderRadius = 8,
                DefaultBackColor = Color.FromArgb(59, 130, 246),
                HoverBackColor = Color.FromArgb(37, 99, 235),
                BorderColor = Color.Transparent,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            btnBrowse.Click += BtnBrowse_Click;

            cardScope.Controls.Add(lblFolder);
            cardScope.Controls.Add(txtSelectedFolder);
            cardScope.Controls.Add(btnBrowse);

            Controls.Add(cardScope);
            currentY += 115;

            // ── INFO EXPORT ────────────────────────────────────────────────────
            var lblInfoExport = new Label
            {
                Text = "📁  Le fichier JSON sera créé dans le même dossier que cet exécutable.",
                Left = 20,
                Top = currentY,
                Width = 704,
                Height = 22,
                ForeColor = Color.FromArgb(52, 211, 153),
                Font = new Font("Segoe UI", 9f, FontStyle.Italic),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            Controls.Add(lblInfoExport);
            currentY += 30;

            // ── BOUTON D'ACTION PRINCIPAL ─────────────────────────────────────────
            btnStartScan = new RoundedButton
            {
                Text = "🚀  DÉMARRER LE SCAN ET EXPORTER EN JSON",
                Left = 20,
                Top = currentY,
                Width = 704,
                Height = 48,
                BorderRadius = 12,
                DefaultBackColor = Color.FromArgb(59, 130, 246),
                HoverBackColor = Color.FromArgb(37, 99, 235),
                DisabledBackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                Enabled = false,
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            btnStartScan.Click += async (s, e) => await StartScanAsync();
            Controls.Add(btnStartScan);
            currentY += 60;

            // ── PROGRESS BAR & STATUS ────────────────────────────────────────────
            progressBar = new ProgressBar
            {
                Left = 20,
                Top = currentY,
                Width = 704,
                Height = 8,
                Style = ProgressBarStyle.Continuous,
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            Controls.Add(progressBar);
            currentY += 14;

            lblStatus = new Label
            {
                Text = "",
                Left = 20,
                Top = currentY,
                Width = 704,
                Height = 22,
                ForeColor = TextMuted,
                Font = new Font("Segoe UI", 9f, FontStyle.Italic),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            Controls.Add(lblStatus);
            currentY += 26;

            // ── CONSOLE LOG ARRONDIE ──────────────────────────────────────────────
            var pnlLogContainer = new RoundedCardPanel
            {
                Left = 20,
                Top = currentY,
                Width = 704,
                Height = 150,
                BorderRadius = 12,
                FillColor = Color.FromArgb(7, 10, 16),
                BorderColor = Color.FromArgb(30, 41, 59),
                Padding = new Padding(8),
                Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };

            txtLog = new RichTextBox
            {
                Dock = DockStyle.Fill,
                ReadOnly = true,
                BackColor = Color.FromArgb(7, 10, 16),
                ForeColor = Color.FromArgb(148, 163, 184),
                BorderStyle = BorderStyle.None,
                Font = new Font("Consolas", 9f, FontStyle.Regular)
            };
            pnlLogContainer.Controls.Add(txtLog);
            Controls.Add(pnlLogContainer);

            Log("Catalogue NAS Client initialisé — Mode Export JSON.", "INFO");

            int nbEds = _listeEds.Count;
            int nbCel = _listeCellules.Count;
            if (nbEds > 0 || nbCel > 0)
                Log($"✓ Configuration chargée : {nbEds} EDS et {nbCel} cellule(s) disponibles. Cliquez ▼ pour sélectionner.", "SUCCESS");
            else
                Log("⚠️ Aucune liste EDS/Cellule dans scan_nas.cfg — saisie manuelle requise.", "WARN");
        }

        // ── ACTIVATION DU BOUTON SCAN (3 champs obligatoires) ──────────────────────
        private void _ActualiserBoutonScan()
        {
            if (InvokeRequired) { Invoke(new Action(_ActualiserBoutonScan)); return; }
            bool pret = !string.IsNullOrWhiteSpace(txtSelectedFolder.Text)
                     && !string.IsNullOrWhiteSpace(txtNasCode.Text)
                     && !string.IsNullOrWhiteSpace(txtCelluleLabel.Text);
            btnStartScan.Enabled = pret;
            btnStartScan.DefaultBackColor = pret ? AccentIndigo : Color.FromArgb(30, 41, 59);
            btnStartScan.Invalidate();
        }

        // ── DROPDOWN EDS (alimenté depuis cfg) ──────────────────────────────────
        private void ShowDropdownEds(Control anchor)
        {
            if (InvokeRequired) { Invoke(new Action(() => ShowDropdownEds(anchor))); return; }
            var menu = _BuildDropdownMenu(
                "EDS / ESPACE DE STOCKAGE",
                _listeEds,
                valeur => { txtNasCode.Text = valeur; _ActualiserBoutonScan(); Log($"✓ EDS sélectionné : '{valeur}'", "SUCCESS"); },
                () => { txtNasCode.Text = ""; _ActualiserBoutonScan(); }
            );
            menu.Show(anchor, new Point(anchor.Width - menu.Width > 0 ? -(menu.Width - anchor.Width) : 0, anchor.Height));
        }

        // ── DROPDOWN CELLULE (alimenté depuis cfg) ──────────────────────────────
        private void ShowDropdownCellule(Control anchor)
        {
            if (InvokeRequired) { Invoke(new Action(() => ShowDropdownCellule(anchor))); return; }
            var menu = _BuildDropdownMenu(
                "CELLULE",
                _listeCellules,
                valeur => { txtCelluleLabel.Text = valeur; _ActualiserBoutonScan(); Log($"✓ Cellule sélectionnée : '{valeur}'", "SUCCESS"); },
                () => { txtCelluleLabel.Text = ""; _ActualiserBoutonScan(); }
            );
            menu.Show(anchor, new Point(anchor.Width - menu.Width > 0 ? -(menu.Width - anchor.Width) : 0, anchor.Height));
        }

        // ── FACTORY : menu déroulant sombre moderne ─────────────────────────────
        private ContextMenuStrip _BuildDropdownMenu(
            string titre, List<string> valeurs,
            Action<string> onSelect, Action onNouveau)
        {
            var menu = new ContextMenuStrip
            {
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.FromArgb(226, 232, 240),
                Font = new Font("Segoe UI", 9.5f),
                ShowCheckMargin = false,
                ShowImageMargin = false,
                DropShadowEnabled = true
            };

            // En-tête
            var header = new ToolStripMenuItem($"  {titre}") { Enabled = false };
            header.ForeColor = Color.FromArgb(99, 102, 241);
            header.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            menu.Items.Add(header);
            menu.Items.Add(new ToolStripSeparator());

            if (valeurs.Count == 0)
            {
                var vide = new ToolStripMenuItem("  Aucune valeur dans le .cfg") { Enabled = false };
                vide.ForeColor = Color.FromArgb(100, 116, 139);
                menu.Items.Add(vide);
            }
            else
            {
                foreach (var v in valeurs)
                {
                    var item = new ToolStripMenuItem($"  {v}");
                    item.ForeColor = Color.FromArgb(226, 232, 240);
                    string capture = v;
                    item.Click += (s, e) => onSelect(capture);
                    menu.Items.Add(item);
                }
            }

            menu.Items.Add(new ToolStripSeparator());
            var newItem = new ToolStripMenuItem("  ✍️  Saisir une nouvelle valeur");
            newItem.ForeColor = Color.FromArgb(251, 191, 36);
            newItem.Click += (s, e) => onNouveau();
            menu.Items.Add(newItem);

            return menu;
        }

        private void BtnBrowse_Click(object sender, EventArgs e)
        {
            using var dialog = new FolderBrowserDialog();
            dialog.Description = "Sélectionnez le dossier NAS à scanner";
            dialog.ShowNewFolderButton = false;

            if (dialog.ShowDialog() == DialogResult.OK && !string.IsNullOrWhiteSpace(dialog.SelectedPath))
            {
                txtSelectedFolder.Text = dialog.SelectedPath;
                Log($"Dossier ciblé : {dialog.SelectedPath}", "SUCCESS");
                _ActualiserBoutonScan();

                if (string.IsNullOrWhiteSpace(txtNasCode.Text) || string.IsNullOrWhiteSpace(txtCelluleLabel.Text))
                    Log("⚠️ Renseignez l'Espace de stockage et la Cellule pour activer le scan.", "WARN");
            }
        }

        private void Log(string message, string level = "INFO")
        {
            if (InvokeRequired)
            {
                Invoke(new Action(() => Log(message, level)));
                return;
            }

            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.SelectionLength = 0;

            txtLog.SelectionColor = Color.FromArgb(100, 116, 139);
            txtLog.AppendText($"[{DateTime.Now:HH:mm:ss}] ");

            switch (level)
            {
                case "SUCCESS":
                    txtLog.SelectionColor = Color.FromArgb(52, 211, 153);
                    break;
                case "WARN":
                    txtLog.SelectionColor = Color.FromArgb(251, 191, 36);
                    break;
                case "ERROR":
                    txtLog.SelectionColor = Color.FromArgb(248, 113, 113);
                    break;
                default:
                    txtLog.SelectionColor = Color.FromArgb(129, 140, 248);
                    break;
            }

            txtLog.AppendText($"{message}\n");
            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.ScrollToCaret();
        }

        private async Task StartScanAsync()
        {
            string rootPath = txtSelectedFolder.Text;
            string nas = txtNasCode.Text.Trim();
            string label = txtCelluleLabel.Text.Trim();

            // Validation obligatoire des champs avant tout scan
            if (string.IsNullOrWhiteSpace(nas) || string.IsNullOrWhiteSpace(label))
            {
                MessageBox.Show(
                    "Veuillez renseigner l'Espace de stockage et la Cellule avant de lancer le scan.\n\nCliquez sur ▼ pour choisir une valeur existante, ou saisissez manuellement.",
                    "Champs requis",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            if (!Directory.Exists(rootPath))
            {
                MessageBox.Show("Le dossier sélectionné n'existe pas.", "Erreur", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            btnStartScan.Enabled = false;
            btnStartScan.Invalidate();
            btnBrowse.Enabled = false;
            progressBar.Value = 0;
            lblStatus.Text = "Analyse en cours...";
            Log($"Lancement de l'indexation sur : {rootPath}", "INFO");

            var filesList = new List<FileMetadata>();
            var startTime = DateTime.Now;

            await Task.Run(() =>
            {
                try
                {
                    var dirInfo = new DirectoryInfo(rootPath);
                    var allFiles = dirInfo.EnumerateFiles("*", SearchOption.AllDirectories);

                    int count = 0;
                    using var md5 = MD5.Create();

                    foreach (var file in allFiles)
                    {
                        count++;
                        string cheminComplet = file.FullName.Replace('\\', '/');
                        while (cheminComplet.Contains("//")) cheminComplet = cheminComplet.Replace("//", "/");
                        string dossierParent = (file.DirectoryName ?? "").Replace('\\', '/');
                        while (dossierParent.Contains("//")) dossierParent = dossierParent.Replace("//", "/");
                        string dateModifStr = file.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss");
                        string signature = $"{cheminComplet.ToLower()}|{file.Length}|{dateModifStr}";
                        string docId = GetMd5Hash(md5, signature);

                        string ext = string.IsNullOrEmpty(file.Extension) ? "" : file.Extension.TrimStart('.').ToLower();

                        filesList.Add(new FileMetadata
                        {
                            id = docId,
                            nom_fichier = file.Name,
                            chemin_complet = cheminComplet,
                            dossier_parent = dossierParent,
                            taille = file.Length,
                            taille_lisible = FormatTailleLisible(file.Length),
                            extension = ext,
                            date_modification = dateModifStr,
                            date_creation = file.CreationTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                            est_vide = file.Length == 0
                        });

                        if (count % 1000 == 0)
                        {
                            int pct = Math.Min(90, (int)((double)count / Math.Max(1, count) * 90));
                            Log($"{count} fichiers analysés...", "INFO");
                            if (progressBar.InvokeRequired)
                                progressBar.Invoke(new Action(() => progressBar.Value = pct));
                            else
                                progressBar.Value = pct;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log($"Erreur lors de l'accès aux fichiers : {ex.Message}", "ERROR");
                }
            });

            double duration = (DateTime.Now - startTime).TotalSeconds;
            Log($"Exploration terminée. Total : {filesList.Count} fichiers en {duration:F2}s.", "SUCCESS");
            progressBar.Value = 95;
            lblStatus.Text = $"Indexation terminée ({filesList.Count} fichiers). Export JSON en cours...";

            // Export JSON obligatoire dans le dossier du .exe
            ExportToJson(nas, label, rootPath, filesList);

            btnStartScan.Enabled = true;
            btnStartScan.DefaultBackColor = AccentIndigo;
            btnStartScan.ForeColor = Color.White;
            btnStartScan.Invalidate();
            btnBrowse.Enabled = true;
            progressBar.Value = 100;
        }

        private void ExportToJson(string nas, string label, string rootPath, List<FileMetadata> files)
        {
            Log("Génération du fichier JSON d'exportation...", "INFO");
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");

            // Export dans le dossier du .exe (pas le Bureau)
            string dossierExport = AppContext.BaseDirectory;
            string filePath = Path.Combine(dossierExport, $"scan_resultat_{timestamp}.json");

            var fullPayload = new ScanPayload
            {
                nas = nas,
                label = label,
                scanned_root_path = rootPath,
                outil_source = "exe",
                is_first_chunk = true,
                is_last_chunk = true,
                files = files
            };

            // IMPORTANT : UTF8 SANS BOM (new UTF8Encoding(false)) pour compatibilité
            // JSON.parse() navigateur. Encoding.UTF8 de C# ajoute un BOM (\xEF\xBB\xBF)
            // qui provoque l'échec silencieux du parsing côté frontend.
            string json = JsonSerializer.Serialize(fullPayload, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(filePath, json, new UTF8Encoding(false));

            Log($"FICHIER CRÉÉ : {filePath}", "SUCCESS");
            lblStatus.Text = $"Fichier JSON exporté : {Path.GetFileName(filePath)}";
            MessageBox.Show(
                $"Fichier d'exportation généré :\n{filePath}\n\nVeuillez le glisser-déposer dans l'interface Web du Catalogue NAS.",
                "Export JSON",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        private static string GetMd5Hash(MD5 md5, string input)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(input);
            byte[] hashBytes = md5.ComputeHash(bytes);
            var sb = new StringBuilder();
            foreach (var b in hashBytes)
                sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private static string FormatTailleLisible(long octets)
        {
            if (octets >= 1073741824) return $"{(double)octets / 1073741824:F2} Go";
            if (octets >= 1048576) return $"{(double)octets / 1048576:F2} Mo";
            if (octets >= 1024) return $"{(double)octets / 1024:F2} Ko";
            return $"{octets} octets";
        }
    }
}
