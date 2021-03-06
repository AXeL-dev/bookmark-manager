import React, { PropsWithChildren, Fragment, useState, useEffect, useMemo, useRef, createRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Menu } from "@material-ui/core"
import { makeStyles, Theme, useTheme, fade } from "@material-ui/core/styles"
import { ArrowRight, ArrowDropDown, FolderTwoTone, FolderOpenTwoTone } from "@material-ui/icons"
import { useDrop, useDrag } from "react-dnd"

import useContextMenu from "../hooks/useContextMenu"
import { selectNode } from "../store/dnd"
import { setHashParam, isNodeFolder, isNodeSelected } from "../utils"
import { moveNodesUnderParent, moveNodesAboveTarget, moveNodesBelowTarget } from "../utils/bookmark"
import { handleHoverAndDrop } from "../utils/dnd"
import { BookmarkTreeNode } from "../../types"
import { RootState, HoverArea } from "../types"
import { DNDTypes } from "../consts"

import FolderTreeItemContextMenuContent from "./FolderTreeItemContextMenuContent"
import HoverStateManager from "../hover-state-manager"

const useFolderTreeItemStyle = makeStyles<Theme, { level: number; active: boolean }>(theme => ({
    container: {
        display: "flex",
        alignItems: "center",
        height: "40px",
        marginLeft: props => props.level * 24,
        cursor: "pointer",
    },
    icon: {
        display: "flex",
        alignItems: "center",
        width: "24px",
        height: "40px",
    },
    text: {
        paddingLeft: "8px",
        color: props => (props.active ? theme.palette.primary.main : theme.palette.text.primary),
    },
}))

export default function FolderTreeItem({
    level,
    bookmarkNode,
    defaultOpen,
    children,
}: PropsWithChildren<{
    level: number
    bookmarkNode: BookmarkTreeNode
    defaultOpen?: boolean
}>) {
    const theme = useTheme()

    const activeFolder = useSelector((state: RootState) => state.bookmark.activeFolder)
    const search = useSelector((state: RootState) => state.bookmark.search)
    // if search state is true, all folder items should stay inactive
    // user should be able to click any folder to active it and clear search state in the mean time
    const isActive = !search && activeFolder !== null && activeFolder.id === bookmarkNode.id

    const selectedNodes = useSelector((state: RootState) => state.dnd.selectedNodes)
    const isSelected = isNodeSelected(bookmarkNode, selectedNodes)

    const dispatch = useDispatch()

    const [open, setOpen] = useState(defaultOpen)

    useEffect(() => {
        if (defaultOpen && !open) {
            setOpen(true)
        }
    }, [defaultOpen])

    const hasSubfolders = useMemo(
        () => Array.isArray(bookmarkNode.children) && bookmarkNode.children.filter(isNodeFolder).length > 0,
        [bookmarkNode],
    )

    const nodeRef = useRef(createRef<HTMLDivElement>())
    const [_, drag] = useDrag({
        item: {
            type: DNDTypes.FolderItem,
        },
        begin: () => {
            dispatch(selectNode(bookmarkNode))
        },
    })
    const [, drop] = useDrop({
        accept: [DNDTypes.BookmarkItem, DNDTypes.FolderItem],
        hover: (item, monitor) => {
            const node = nodeRef.current.current
            if (node) {
                HoverStateManager.subscribe({
                    bookmarkNode,
                    isSelected,
                    node,
                    theme,
                })
                handleHoverAndDrop({
                    node,
                    monitor,
                    top: () => HoverStateManager.applyHoverStyle(HoverArea.Top),
                    mid: () => HoverStateManager.applyHoverStyle(HoverArea.Mid),
                    bottom: () => HoverStateManager.applyHoverStyle(HoverArea.Bottom),
                })
            }
        },
        drop: (item, monitor) => {
            const node = nodeRef.current.current
            if (node) {
                handleHoverAndDrop({
                    node,
                    monitor,
                    top: () => {
                        if (selectedNodes.length === 1 && isNodeFolder(selectedNodes[0])) {
                            moveNodesAboveTarget(selectedNodes, bookmarkNode)
                        }
                    },
                    mid: () => moveNodesUnderParent(selectedNodes, bookmarkNode),
                    bottom: () => {
                        if (selectedNodes.length === 1 && isNodeFolder(selectedNodes[0])) {
                            moveNodesBelowTarget(selectedNodes, bookmarkNode)
                        }
                    },
                })
            }
            HoverStateManager.reset()
        },
    })

    drag(drop(nodeRef.current))

    const classNames = useFolderTreeItemStyle({
        level,
        active: isActive,
    })

    const { contextMenuProps, handleContextMenuEvent, closeContextMenu } = useContextMenu()

    return (
        <Fragment>
            <div
                ref={nodeRef.current}
                className={classNames.container}
                style={{
                    backgroundColor: isSelected ? fade(theme.palette.primary.main, 0.25) : undefined,
                }}
                onClick={e => {
                    e.stopPropagation()
                    if (!isActive) {
                        // there are two cases when isActive is false:
                        if (search) {
                            // 1: search state is not empty
                            setHashParam({
                                folder: bookmarkNode.id,
                                search: undefined,
                            })
                        } else {
                            // 2: search state is empty and there is no active folder
                            setHashParam({ folder: bookmarkNode.id })
                        }
                    }
                }}
                onContextMenu={e => {
                    e.preventDefault()
                    setHashParam({ folder: bookmarkNode.id })
                    handleContextMenuEvent(e)
                }}
            >
                <div className={classNames.icon}>
                    {hasSubfolders &&
                        (open ? (
                            <ArrowDropDown
                                onClick={e => {
                                    e.stopPropagation()
                                    setOpen(false)
                                }}
                            />
                        ) : (
                            <ArrowRight
                                onClick={e => {
                                    e.stopPropagation()
                                    setOpen(true)
                                }}
                            />
                        ))}
                </div>
                <div className={classNames.icon}>{open ? <FolderOpenTwoTone /> : <FolderTwoTone />}</div>
                <div className={classNames.text}>{bookmarkNode.title}</div>
            </div>
            <Menu {...contextMenuProps}>
                <FolderTreeItemContextMenuContent bookmarkNode={bookmarkNode} onClose={closeContextMenu} />
            </Menu>
            {open && children}
        </Fragment>
    )
}
