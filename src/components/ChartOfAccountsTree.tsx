import React, { useState, useCallback } from "react";
import { ChevronRight, Folder, File, FolderOpen, Plus, Edit, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Account } from "@/state/accounting";

// Types
export type TreeNode = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: Account;
};

export type ChartOfAccountsTreeProps = {
  data: TreeNode[];
  className?: string;
  onNodeClick?: (node: TreeNode) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  defaultExpandedIds?: string[];
  showLines?: boolean;
  showIcons?: boolean;
  indent?: number;
  animateExpand?: boolean;
  // Action handlers
  onAddSubAccount?: (account: Account) => void;
  onEditAccount?: (accountId: string) => void;
  onDeleteAccount?: (accountId: string) => void;
  onViewAccount?: (accountId: string) => void;
  hoveredAccountId?: string;
  onAccountHover?: (accountId: string | undefined) => void;
};

// Main ChartOfAccountsTree component
export function ChartOfAccountsTree({
  data,
  className,
  onNodeClick,
  onNodeExpand,
  defaultExpandedIds = [],
  showLines = true,
  showIcons = true,
  indent = 20,
  animateExpand = true,
  onAddSubAccount,
  onEditAccount,
  onDeleteAccount,
  onViewAccount,
  hoveredAccountId,
  onAccountHover,
}: ChartOfAccountsTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds),
  );

  const toggleExpanded = useCallback(
    (nodeId: string) => {
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        const isExpanded = newSet.has(nodeId);
        isExpanded ? newSet.delete(nodeId) : newSet.add(nodeId);
        onNodeExpand?.(nodeId, !isExpanded);
        return newSet;
      });
    },
    [onNodeExpand],
  );

  const renderNode = (
    node: TreeNode,
    level = 0,
    isLast = false,
    parentPath: boolean[] = [],
  ) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedIds.has(node.id);
    const currentPath = [...parentPath, isLast];
    const isAccount = node.data && !hasChildren; // Only show actions for actual accounts, not type groups

    const getDefaultIcon = () =>
      hasChildren ? (
        isExpanded ? (
          <FolderOpen className="h-4 w-4" />
        ) : (
          <Folder className="h-4 w-4" />
        )
      ) : (
        <File className="h-4 w-4" />
      );

    return (
      <div key={node.id} className="select-none">
        <motion.div
          className={cn(
            "flex items-center py-2 px-3 cursor-pointer transition-all duration-200 relative group rounded-md mx-1",
            "hover:bg-accent/50",
            showLines && level > 0 && "hover:border-accent-foreground/10",
          )}
          style={{ paddingLeft: level * indent + 8 }}
          onClick={(e) => {
            if (hasChildren) toggleExpanded(node.id);
            onNodeClick?.(node);
          }}
          onMouseEnter={() => isAccount && onAccountHover?.(node.id)}
          onMouseLeave={() => isAccount && onAccountHover?.(undefined)}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
          {/* Tree Lines */}
          {showLines && level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
              {currentPath.map((isLastInPath, pathIndex) => (
                <div
                  key={pathIndex}
                  className="absolute top-0 bottom-0 border-l border-border/40"
                  style={{
                    left: pathIndex * indent + 12,
                    display:
                      pathIndex === currentPath.length - 1 && isLastInPath
                        ? "none"
                        : "block",
                  }}
                />
              ))}
              <div
                className="absolute top-1/2 border-t border-border/40"
                style={{
                  left: (level - 1) * indent + 12,
                  width: indent - 4,
                  transform: "translateY(-1px)",
                }}
              />
              {isLast && (
                <div
                  className="absolute top-0 border-l border-border/40"
                  style={{
                    left: (level - 1) * indent + 12,
                    height: "50%",
                  }}
                />
              )}
            </div>
          )}

          {/* Expand Icon */}
          <motion.div
            className="flex items-center justify-center w-4 h-4 mr-1"
            animate={{ rotate: hasChildren && isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {hasChildren && (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </motion.div>

          {/* Node Icon */}
          {showIcons && (
            <motion.div
              className="flex items-center justify-center w-4 h-4 mr-2 text-muted-foreground"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.15 }}
            >
              {node.icon || getDefaultIcon()}
            </motion.div>
          )}

          {/* Label */}
          <span className="text-sm font-medium truncate flex-1">{node.label}</span>

          {/* Action Buttons - Only show for accounts, not type groups */}
          {isAccount && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/80 backdrop-blur-sm rounded-md p-1 border border-gray-200 shadow-sm">
              {/* Add Sub Account Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubAccount?.(node.data!);
                }}
                className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                title="Add Sub Account"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              {/* View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAccount?.(node.id);
                }}
                className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                title="View Account"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>

              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditAccount?.(node.id);
                }}
                className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600 transition-colors"
                title="Edit Account"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAccount?.(node.id);
                }}
                className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                title="Delete Account"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: animateExpand ? 0.3 : 0,
                ease: "easeInOut",
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                transition={{
                  duration: animateExpand ? 0.2 : 0,
                  delay: animateExpand ? 0.1 : 0,
                }}
              >
                {node.children!.map((child, index) =>
                  renderNode(
                    child,
                    level + 1,
                    index === node.children!.length - 1,
                    currentPath,
                  ),
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className={cn(
        "w-full bg-background border border-border rounded-xl",
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="p-2">
        {data.map((node, index) =>
          renderNode(node, 0, index === data.length - 1),
        )}
      </div>
    </motion.div>
  );
}

export default ChartOfAccountsTree;
