import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface CanProps {
    /** The permission code to check, e.g. 'invoice:field:edit_discount' */
    perform: string;
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
 * <Can perform="equipment:delete" fallback={<Tooltip title="No permission"><span><Button disabled>Delete</Button></span></Tooltip>}>
 *   <Button onClick={handleDelete}>Delete</Button>
 * </Can>
 */
export const Can: React.FC<CanProps> = ({ perform, children, fallback = null }) => {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    return hasPermission(perform) ? <>{children}</> : <>{fallback}</>;
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

export default Can;
