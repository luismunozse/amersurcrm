import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
  TableCaption,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Wrapper de Table con estilos CRM
const CRMTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <Table
    ref={ref}
    className={cn("border border-crm-border rounded-lg overflow-hidden", className)}
    {...props}
  />
));
CRMTable.displayName = "CRMTable";

// Wrapper de TableHeader con estilos CRM
const CRMTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <TableHeader
    ref={ref}
    className={cn("bg-crm-card-hover", className)}
    {...props}
  />
));
CRMTableHeader.displayName = "CRMTableHeader";

// Wrapper de TableHead con estilos CRM
const CRMTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <TableHead
    ref={ref}
    className={cn(
      "text-crm-text-secondary font-medium text-xs uppercase tracking-wider",
      className
    )}
    {...props}
  />
));
CRMTableHead.displayName = "CRMTableHead";

// Wrapper de TableBody con estilos CRM
const CRMTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <TableBody ref={ref} className={cn("bg-crm-card", className)} {...props} />
));
CRMTableBody.displayName = "CRMTableBody";

// Wrapper de TableRow con estilos CRM
const CRMTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <TableRow
    ref={ref}
    className={cn(
      "border-crm-border hover:bg-crm-card-hover transition-colors",
      className
    )}
    {...props}
  />
));
CRMTableRow.displayName = "CRMTableRow";

// Wrapper de TableCell con estilos CRM
const CRMTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <TableCell
    ref={ref}
    className={cn("text-crm-text-primary py-3", className)}
    {...props}
  />
));
CRMTableCell.displayName = "CRMTableCell";

// Re-exportar TableFooter y TableCaption sin cambios
const CRMTableFooter = TableFooter;
const CRMTableCaption = TableCaption;

export {
  CRMTable,
  CRMTableHeader,
  CRMTableHead,
  CRMTableBody,
  CRMTableRow,
  CRMTableCell,
  CRMTableFooter,
  CRMTableCaption,
};
