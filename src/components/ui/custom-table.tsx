"use client"

import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/shadcn/table"
import { cn } from "@/lib/utils"

export interface Column<T> {
    header: string
    accessorKey?: keyof T
    render?: (item: T) => React.ReactNode
    className?: string
    headerClassName?: string
}

interface CustomTableProps<T> {
    data: T[]
    columns: Column<T>[]
    className?: string
    onSelectionChange?: (selectedItems: T[]) => void
    enableSelection?: boolean
    selectedItems?: T[]
    keyField?: string
    minRows?: number
}

export function CustomTable<T extends Record<string, any>>({
    data,
    columns,
    className,
    onSelectionChange,
    selectedItems = [],
    enableSelection = false,
    keyField = "id",
    minRows = 0
}: CustomTableProps<T>) {
    // Memoize the set of selected keys for O(1) lookups
    const selectedKeys = React.useMemo(() =>
        new Set(selectedItems.map(item => item[keyField])),
        [selectedItems, keyField]);

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;

        if (checked) {
            // Add all currently visible items to selection if not already selected
            const newSelected = [...selectedItems];
            data.forEach(item => {
                if (!selectedKeys.has(item[keyField])) {
                    newSelected.push(item);
                }
            });
            onSelectionChange(newSelected);
        } else {
            // Remove all currently visible items from selection
            const currentPageKeys = new Set(data.map(item => item[keyField]));
            const newSelected = selectedItems.filter(item => !currentPageKeys.has(item[keyField]));
            onSelectionChange(newSelected);
        }
    }

    const handleSelectRow = (item: T, checked: boolean) => {
        if (!onSelectionChange) return;

        const itemId = item[keyField];
        if (checked) {
            onSelectionChange([...selectedItems, item]);
        } else {
            onSelectionChange(selectedItems.filter(i => i[keyField] !== itemId));
        }
    }

    // Check if all items on the current page are selected
    const isAllSelected = data.length > 0 && data.every(item => selectedKeys.has(item[keyField]));
    // Check if some but not all items on the current page are selected (indeterminate state could be added later)

    return (
        <div className={cn("w-full rounded-[20px] border border-sky-950/20 overflow-x-hidden overflow-y-auto", className)}>
            <Table>
                <TableHeader className="bg-[#003366] sticky top-0 z-10">
                    <TableRow className="border-b-0 hover:bg-[#003366]">
                        {enableSelection && (
                            <TableHead className="w-[50px] border-r border-white/20 text-center py-4 bg-[#003366]">
                                <button
                                    onClick={() => handleSelectAll(!isAllSelected)}
                                    className="flex items-center justify-center w-full h-full focus:outline-none cursor-pointer group"
                                >
                                    <span
                                        className={cn(
                                            "text-2xl transition-all duration-200",
                                            isAllSelected ? "icon-[mdi--checkbox-marked]" : "icon-[mdi--checkbox-blank-outline]",
                                            "text-white group-hover:scale-110"
                                        )}
                                    ></span>
                                </button>
                            </TableHead>
                        )}
                        {columns.map((col, index) => (
                            <TableHead
                                key={index}
                                className={cn(
                                    "text-white font-bold text-base text-center py-4 border-r border-white/20 uppercase tracking-wider h-auto last:border-r-0 bg-[#003366]",
                                    col.headerClassName
                                )}
                            >
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item, rowIndex) => {
                        const itemId = item[keyField];
                        const isSelected = selectedKeys.has(itemId);

                        return (
                            <TableRow
                                key={itemId || rowIndex}
                                className={cn(
                                    "border-b border-sky-950/20 hover:bg-neutral-100 transition-colors",
                                    isSelected && "bg-blue-50"
                                )}
                            >
                                {enableSelection && (
                                    <TableCell className="text-center py-4 border-r border-sky-950/20 align-middle">
                                        <button
                                            onClick={() => handleSelectRow(item, !isSelected)}
                                            className="flex items-center justify-center w-full h-full focus:outline-none cursor-pointer group"
                                        >
                                            <span
                                                className={cn(
                                                    "text-2xl transition-all duration-200",
                                                    isSelected
                                                        ? "icon-[mdi--checkbox-marked] text-[#003366]"
                                                        : "icon-[mdi--checkbox-blank-outline] text-gray-400 group-hover:text-[#003366]"
                                                )}
                                            ></span>
                                        </button>
                                    </TableCell>
                                )}
                                {columns.map((col, colIndex) => (
                                    <TableCell
                                        key={colIndex}
                                        className={cn(
                                            "text-sky-950 text-lg border-r border-sky-950/20 py-4 align-middle break-words",
                                            col.className
                                        )}
                                    >
                                        {col.render
                                            ? col.render(item)
                                            : col.accessorKey
                                                ? (item[col.accessorKey] as React.ReactNode)
                                                : null}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                    {/* Empty Rows Filler */}
                    {Array.from({ length: Math.max(0, (minRows || 0) - data.length) }).map((_, index) => (
                        <TableRow key={`empty-${index}`} className="border-b border-sky-950/20 hover:bg-transparent">
                            {enableSelection && (
                                <TableCell className="py-4 border-r border-sky-950/20" />
                            )}
                            {columns.map((_, colIndex) => (
                                <TableCell
                                    key={`empty-col-${colIndex}`}
                                    className="py-4 border-r border-sky-950/20"
                                >
                                    &nbsp;
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
