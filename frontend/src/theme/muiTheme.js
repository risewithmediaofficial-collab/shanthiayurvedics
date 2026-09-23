import { createTheme, alpha } from "@mui/material/styles";

const ayur = {
  50: "#f2f9f5", 100: "#e1f2e8", 200: "#c5e4d2", 300: "#99cfb3",
  400: "#64b28d", 500: "#3e956e", 600: "#2d7756", 700: "#255e46",
  800: "#204b39", 900: "#1c3e30", 950: "#0c221a",
};

const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary:    { main: ayur[700], light: ayur[400], dark: ayur[800], contrastText: "#fff" },
    secondary:  { main: "#0284c7", contrastText: "#fff" },
    success:    { main: "#16a34a" },
    warning:    { main: "#d97706" },
    error:      { main: "#dc2626" },
    background: { default: "#f8fafc", paper: "#ffffff" },
    text:       { primary: "#1e293b", secondary: "#64748b", disabled: "#94a3b8" },
    divider:    "#e2e8f0",
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13.5,
    htmlFontSize: 16,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: { fontSize: "2rem",     fontWeight: 600, lineHeight: 1.2,  letterSpacing: "-0.025em" },
    h2: { fontSize: "1.75rem",  fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.02em" },
    h3: { fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.3,  letterSpacing: "-0.015em" },
    h4: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.01em" },
    h5: { fontSize: "1rem",     fontWeight: 600, lineHeight: 1.4,  letterSpacing: "-0.01em" },
    h6: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.45, letterSpacing: "-0.005em" },
    subtitle1: { fontSize: "0.9375rem", fontWeight: 500, lineHeight: 1.5, letterSpacing: "-0.005em" },
    subtitle2: { fontSize: "0.875rem",  fontWeight: 500, lineHeight: 1.5, letterSpacing: "-0.005em" },
    body1:     { fontSize: "0.875rem",  fontWeight: 400, lineHeight: 1.55, letterSpacing: "-0.01em" },
    body2:     { fontSize: "0.8125rem", fontWeight: 400, lineHeight: 1.5, letterSpacing: "-0.005em" },
    caption:   { fontSize: "0.75rem",   fontWeight: 500, lineHeight: 1.5, letterSpacing: "0.01em" },
    overline:  { fontSize: "0.6875rem", fontWeight: 600, lineHeight: 1.5, letterSpacing: "0.06em", textTransform: "uppercase" },
    button:    { fontSize: "0.8125rem", fontWeight: 600, textTransform: "none", letterSpacing: "0.005em" },
  },
  spacing: 4,
  shape: { borderRadius: 14 },
  breakpoints: {
    values: { xs: 0, sm: 480, md: 768, lg: 1024, xl: 1280 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
        "::-webkit-scrollbar": { width: "6px", height: "6px" },
        "::-webkit-scrollbar-track": { background: "#f1f5f9" },
        "::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "9999px" },
        "::-webkit-scrollbar-thumb:hover": { background: "#94a3b8" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: "10px", textTransform: "none", fontWeight: 600, fontSize: "0.8125rem" },
        containedPrimary: { backgroundColor: ayur[700], "&:hover": { backgroundColor: ayur[800] } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: "10px" } },
    },
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          backgroundColor: "#fff",
          fontSize: "0.875rem",
          "& fieldset": { borderColor: "#cbd5e1" },
          "&:hover fieldset": { borderColor: "#94a3b8" },
          "&.Mui-focused fieldset": { borderColor: ayur[600], borderWidth: "1.5px" },
        },
        input: { padding: "8px 14px" },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: "0.8125rem", color: "#475569", "&.Mui-focused": { color: ayur[700] } },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none", borderRadius: "12px", border: "1px solid #e2e8f0" },
        elevation1: { boxShadow: "0 1px 3px 0 rgba(0,0,0,0.06)" },
        elevation2: { boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06)" },
        elevation3: { boxShadow: "0 8px 30px -4px rgba(0,0,0,0.1)" },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { width: 240, border: "none", borderRight: "1px solid #e2e8f0", boxShadow: "none", borderRadius: 0 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a" },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: "56px !important", paddingLeft: "16px !important", paddingRight: "16px !important" },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: "42px" },
        indicator: { backgroundColor: ayur[700], height: "2px" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: "42px", textTransform: "none", fontWeight: 600, fontSize: "0.8125rem", color: "#64748b", "&.Mui-selected": { color: ayur[700] } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: "8px", fontSize: "0.6875rem", fontWeight: 600, height: "22px" },
        colorPrimary: { backgroundColor: alpha(ayur[500], 0.12), color: ayur[700], border: `1px solid ${alpha(ayur[500], 0.2)}` },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "0.6875rem", fontWeight: 500, borderRadius: "8px", padding: "4px 10px" },
        arrow: { color: "#1e293b" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 8px 30px -4px rgba(0,0,0,0.12)", minWidth: "180px" },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.8125rem", fontWeight: 500, borderRadius: "8px", margin: "2px 6px", padding: "8px 12px",
          "&:hover": { backgroundColor: "#f1f5f9" },
          "&.Mui-selected": { backgroundColor: alpha(ayur[500], 0.1), color: ayur[700] },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 16px" },
        body: { fontSize: "0.8125rem", color: "#334155", borderBottom: "1px solid #f1f5f9", padding: "12px 16px" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover .MuiTableCell-body": { backgroundColor: "#f8fafc" }, "&:last-child .MuiTableCell-body": { borderBottom: 0 } },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { backgroundColor: ayur[100], color: ayur[700], fontWeight: 700, fontSize: "0.8125rem" },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontSize: "0.625rem", fontWeight: 700, minWidth: "16px", height: "16px", padding: "0 4px" },
        colorError: { backgroundColor: "#dc2626" },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: "10px", fontSize: "0.8125rem", border: "1px solid" },
        standardError:   { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
        standardWarning: { borderColor: "#fed7aa", backgroundColor: "#fff7ed" },
        standardSuccess: { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
        standardInfo:    { borderColor: "#bae6fd", backgroundColor: "#f0f9ff" },
      },
    },
    MuiDivider:  { styleOverrides: { root: { borderColor: "#e2e8f0" } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "10px", padding: "6px 12px",
          "&:hover": { backgroundColor: "#f1f5f9" },
          "&.Mui-selected": {
            backgroundColor: ayur[700], color: "#fff",
            "&:hover": { backgroundColor: ayur[800] },
            "& .MuiListItemIcon-root": { color: "#fff" },
          },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: "36px", color: "#64748b" } } },
    MuiListItemText: {
      styleOverrides: { primary: { fontSize: "0.8125rem", fontWeight: 600 }, secondary: { fontSize: "0.75rem" } },
    },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: "8px", backgroundColor: "#f1f5f9" } } },
  },
});

export default muiTheme;
