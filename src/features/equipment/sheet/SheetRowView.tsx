import { memo } from "react";
import type { ReactNode } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ReplayIcon from "@mui/icons-material/Replay";

import { ImageHoverPreview } from "../components/ImageHoverPreview";
import { alignsRight, displayValue, type Column, type Field, type Lookups, type RowErrors, type SheetRow } from "./sheetModel";

export interface RowLabels {
  was: (value: string) => string;
  error: (code: string) => string;
  photo: string;
  duplicate: string;
  remove: string;
  restore: string;
}

interface Props {
  row: SheetRow;
  index: number;
  columns: Column[];
  lefts: Record<string, number>;
  frozen: string[];
  /** Selected columns in this row, or -1 for none. */
  c1: number;
  c2: number;
  activeCol: number;
  editingCol: number;
  editor: ReactNode;
  errors?: RowErrors;
  lookups: Lookups;
  labels: RowLabels;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

/** One row. Plain text cells and shared classes, so hundreds of rows stay smooth. */
export const SheetRowView = memo(function SheetRowView({ row, index, columns, lefts, frozen, c1, c2, activeCol, editingCol, editor, errors, lookups, labels, canEdit, canCreate, canDelete }: Props) {
  const writable = !row.isDeleted && (row.isNew ? canCreate : canEdit);
  const rowError = errors?.row;

  return (
    <tr data-k={row.key} data-testid="sheet-row" className={row.isNew ? "add" : row.isDeleted ? "del" : undefined}>
      <td className={`hd rowh${c1 === 0 && c2 === columns.length - 1 ? " rowsel" : ""}${rowError ? " err" : ""}`} data-rowh="1" style={{ left: 0 }} title={rowError ? labels.error(rowError) : undefined}>
        {index + 1}
      </td>
      <td className="hd ph" style={{ left: lefts.__photo }}>
        <ImageHoverPreview src={row.photoUrl} fallbackTitle={labels.photo}>
          <button type="button" className="thumb" data-act="photo" aria-label={`${labels.photo}: ${row.values.equipment_name}`} disabled={row.isDeleted || (row.isNew ? !canCreate : !canEdit)}>
            {row.photoUrl ? <img src={row.photoUrl} alt="" /> : <PhotoCameraOutlinedIcon sx={{ fontSize: 15 }} />}
          </button>
        </ImageHoverPreview>
      </td>
      {columns.map((col, i) => {
        const field = col.key as Field;
        const readOnly = col.kind === "readonly" || !writable;
        const edited = !!row.edited[field];
        const code = errors?.[field];
        const text = displayValue(col, row, lookups);
        const cls = ["c"];
        if (col.kind === "readonly") cls.push("ro");
        if (edited) cls.push("edit");
        if (code) cls.push("err");
        if (i >= c1 && i <= c2 && c1 >= 0) cls.push("inr");
        if (i === activeCol) cls.push("act");
        if (alignsRight(col)) cls.push("num");
        if (i === editingCol) cls.push("editing");
        if (frozen.includes(col.key)) cls.push("fz");
        const title = code ? labels.error(code) : edited && row.base ? labels.was(displayValue(col, { ...row, values: row.base }, lookups)) : text.length > 18 ? text : undefined;
        return (
          <td key={col.key} data-c={i} className={cls.join(" ")} style={frozen.includes(col.key) ? { left: lefts[col.key] } : undefined} title={title} aria-selected={i >= c1 && i <= c2 && c1 >= 0}>
            {i === editingCol ? (
              editor
            ) : col.kind === "bool" ? (
              <input type="checkbox" checked={row.values[field] === "true"} readOnly disabled={readOnly} tabIndex={-1} data-act="toggle" aria-label={`${col.key} ${index + 1}`} />
            ) : (
              text
            )}
          </td>
        );
      })}
      <td className="hd acts">
        {!row.isDeleted && (canCreate || row.isNew) && (
          <button type="button" className="ic" data-act="duplicate" title={labels.duplicate} aria-label={`${labels.duplicate} ${row.values.equipment_name}`}>
            <ContentCopyIcon sx={{ fontSize: 13 }} />
          </button>
        )}
        {(canDelete || row.isNew) && (
          <button type="button" className="ic" data-act="delete" title={row.isDeleted ? labels.restore : labels.remove} aria-label={`${row.isDeleted ? labels.restore : labels.remove} ${row.values.equipment_name}`}>
            {row.isDeleted ? <ReplayIcon sx={{ fontSize: 14 }} /> : <DeleteOutlinedIcon sx={{ fontSize: 14 }} />}
          </button>
        )}
      </td>
    </tr>
  );
});
