import { Theme } from '@mui/material/styles';
import { CSSObject } from '@mui/system';

/**
 * Responsive utility functions for consistent mobile-first design patterns
 * Use these to ensure uniform responsiveness across pages
 */

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE SPACING & SIZING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Responsive container padding
 * Usage: sx={{ ...responsiveContainerPadding() }}
 */
export const responsiveContainerPadding = () => ({
    px: { xs: 2, sm: 2.5, md: 3, lg: 4 },
    py: { xs: 2, sm: 2, md: 3, lg: 4 },
});

/**
 * Responsive page header spacing
 * Usage: sx={{ ...responsiveHeaderGap() }}
 */
export const responsiveHeaderGap = () => ({
    mb: { xs: 2, sm: 2.5, md: 3 },
});

/**
 * Responsive gap between sections
 * Usage: sx={{ ...responsiveSectionGap() }}
 */
export const responsiveSectionGap = () => ({
    gap: { xs: 2, sm: 2, md: 3, lg: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Responsive heading sizes for page titles
 * Usage: <Typography sx={responsiveHeading()}>Title</Typography>
 */
export const responsiveHeading = (): CSSObject => ({
    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem', lg: '2.25rem' },
    lineHeight: 1.2,
});

/**
 * Responsive subtitle sizes
 * Usage: <Typography sx={responsiveSubtitle()}>Subtitle</Typography>
 */
export const responsiveSubtitle = (): CSSObject => ({
    fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem', lg: '1rem' },
    lineHeight: 1.5,
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE TABLE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Responsive table container - enables horizontal scroll on mobile
 * Wrap <TableContainer> with this sx
 * Usage: <Box sx={responsiveTableWrapper()}>
 *          <TableContainer>...</TableContainer>
 *        </Box>
 */
export const responsiveTableWrapper = (): CSSObject => ({
    overflowX: { xs: 'auto', md: 'visible' },
    borderRadius: 2,
    '& table': {
        minWidth: { xs: 800, md: 'auto' },
    },
    // Smooth scrolling on iOS
    WebkitOverflowScrolling: 'touch',
});

/**
 * DataGrid responsive sizing
 * Usage: sx={{ height: { xs: 400, sm: 500, md: 600 }, ...responsiveDataGrid() }}
 */
export const responsiveDataGrid = (): CSSObject => ({
    '& .MuiDataGrid-root': {
        fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
    },
    '& .MuiDataGrid-cell': {
        padding: { xs: '4px 8px', md: '8px 16px' },
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE FLEX LAYOUTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flex header that stacks on mobile
 * Usage: sx={responsiveFlexHeader()}
 */
export const responsiveFlexHeader = (): CSSObject => ({
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    justifyContent: 'space-between',
    alignItems: { xs: 'flex-start', sm: 'center' },
    gap: { xs: 2, sm: 3 },
});

/**
 * Two-column layout that stacks on mobile
 * Usage: sx={responsiveTwoColumn()}
 */
export const responsiveTwoColumn = (): CSSObject => ({
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
    gap: { xs: 2, sm: 2.5, md: 3 },
});

/**
 * Three-column grid that responsive collapses
 * Usage: sx={responsiveThreeColumn()}
 */
export const responsiveThreeColumn = (): CSSObject => ({
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
    gap: { xs: 2, sm: 2.5, md: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE CARD STYLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Responsive KPI card styling
 * Usage: sx={{ ...responsiveKpiCard(), ... }}
 */
export const responsiveKpiCard = (): CSSObject => ({
    p: { xs: 2, sm: 2.5, md: 3 },
    flex: { xs: '0 0 calc(50% - 6px)', sm: '1', md: '1' },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE DIALOG / DRAWER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dialog max-width responsive
 * Returns appropriate maxWidth for dialog based on screen size
 * Usage: <Dialog maxWidth={responsiveDialogWidth(theme)}>
 */
export const responsiveDialogWidth = (theme: Theme): 'xs' | 'sm' | 'md' | 'lg' => {
    return theme.breakpoints.down('md') ? 'xs' : 'sm';
};

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE BUTTON SIZES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Responsive button sizing
 * Usage: <Button size={responsiveButtonSize(isMobile)}>
 */
export const responsiveButtonSize = (isMobile: boolean): 'small' | 'medium' => {
    return isMobile ? 'small' : 'medium';
};

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE-FIRST VISIBILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Show only on mobile
 * Usage: sx={hiddenOnDesktop()}
 */
export const hiddenOnDesktop = (): CSSObject => ({
    display: { xs: 'block', md: 'none' },
});

/**
 * Hide on mobile
 * Usage: sx={hiddenOnMobile()}
 */
export const hiddenOnMobile = (): CSSObject => ({
    display: { xs: 'none', md: 'block' },
});

/**
 * Hidden on small screens only
 * Usage: sx={hiddenOnSmall()}
 */
export const hiddenOnSmall = (): CSSObject => ({
    display: { xs: 'none', sm: 'block' },
});
