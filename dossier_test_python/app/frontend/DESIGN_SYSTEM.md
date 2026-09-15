# Design System - Catalogue NAS

Ce document décrit les règles de direction artistique, d'accessibilité et de style pour l'application.

---

## 🎨 Palette de Couleurs

### 1. Thème Sombre (Standard)

| Variable CSS | Rôle | Valeur Hex / RGBA |
| :--- | :--- | :--- |
| `--color-bg` | Arrière-plan principal | `#0b0d14` (Très sombre) |
| `--color-bg2` | Arrière-plan secondaire (cartes, panels) | `#111420` |
| `--color-bg3` | Arrière-plan tertiaire / Surbrillances | `#171b2d` |
| `--color-surface` | Surfaces transparentes | `rgba(255, 255, 255, 0.04)` |
| `--color-surface2` | Surfaces transparentes actives / survol | `rgba(255, 255, 255, 0.08)` |
| `--color-border` | Bordures discrètes | `rgba(255, 255, 255, 0.08)` |
| `--color-border2` | Bordures de contrôle / actives | `rgba(255, 255, 255, 0.14)` |
| `--color-accent` | Couleur primaire d'accentuation (Bleu) | `#6c8fff` |
| `--color-accent2` | Couleur secondaire d'accentuation (Violet) | `#a78bfa` |

### 2. Thème Clothilde (Rose / Violet)

| Variable CSS | Rôle | Valeur Hex / RGBA |
| :--- | :--- | :--- |
| `--color-bg` | Arrière-plan principal | `#0f050e` |
| `--color-bg2` | Arrière-plan secondaire | `#190918` |
| `--color-bg3` | Arrière-plan tertiaire | `#260e25` |
| `--color-accent` | Couleur primaire d'accentuation (Rose) | `#f472b6` |
| `--color-accent2` | Couleur secondaire d'accentuation (Fuchsia) | `#ec4899` |

### 3. Statuts (Sémantique stricte)

* **Succès (Vert) :** `#34d399` (`--color-success`). Utilisé pour indiquer la réussite d'une action ou un état connecté.
* **Avertissement (Orange) :** `#fbbf24` (`--color-warn`). Utilisé uniquement pour les messages d'avertissement ou de vigilance.
* **Danger / Erreur (Rouge) :** `#f87171` (`--color-danger`). Utilisé pour les erreurs critiques ou les suppressions définitives.

---

## ✍️ Typographie & Accessibilité

* **Textes Principaux (`--color-text`, `#e2e8f0`) :** Utilisés pour le corps de texte et les titres importants.
* **Textes Secondaires (`--color-text2`, `#94a3b8` -> rehaussé à `#A0AEC0`) :** Utilisés pour les descriptions, labels de formulaires et informations complémentaires.
* **Textes Tertiaires / Chemins (`--color-text3`, `#64748b` -> rehaussé à `#9CA3AF`) :** Utilisés pour les chemins d'accès (`C:\...`), légendes et éléments de second plan pour assurer un contraste conforme WCAG AA sur fonds sombres.

---

## 🎛️ Composants standards

* **Boutons d'Action (Primaires) :** Fond dégradé ou couleur accentuée (`--color-accent`). Doivent être clairement interactifs.
* **Champs de Saisie (Inputs) :**
  * Bordure subtile (`--color-border`).
  * Placeholder discret (`--color-text3` avec opacité).
  * Texte saisi net et lumineux (`--color-text`).
* **Onglets de Navigation :**
  * État inactif : Texte gris secondaire (`text-text2`), fond transparent.
  * État actif : Souligné par une ligne accentuée, texte accentué (`text-accent`), ou fond gradient discret.
