import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface CanProps {
    /** The permission code(s) to check, e.g. 'invoice:field:edit_discount' or ['equipment:bulk_edit', 'equipment:edit'] */
    perform: string | string[];
    /** Content to render if the user HAS the permission */
    children: React.ReactNode;
    /** Optional fallback to render if the user LACKS the permission (default: null) */
    fallback?: React.ReactNode;
}

/**
 * Fine-grained permission gate component.
 *
 * @example
 * <Can perform="invoice:field:edit_discount">
 *   <DiscountInput />
 * </Can>
 *
 * @example
 * <Can perform={["equipment:bulk_edit", "equipment:edit"]}>
 *   <BulkEditButton />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({ perform, children, fallback = null }) => {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);

    const allowed = Array.isArray(perform)
        ? hasAnyPermission(...perform)
        : hasPermission(perform);

    return allowed ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook version for conditional logic outside JSX.
 *
 * @example
 * const canEditDiscount = useCanPerform('invoice:field:edit_discount');
 * if (canEditDiscount) { ... }
 */
export const useCanPerform = (permission: string): boolean => {
    return useAuthStore((s) => s.hasPermission)(permission);
};

export const useCanPerformAny = (...permissions: string[]): boolean => {
    return useAuthStore((s) => s.hasAnyPermission)(...permissions);
};

export default Can;
