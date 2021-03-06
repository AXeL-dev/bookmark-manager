import React, { useEffect, useRef, createRef, Fragment } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Menu } from "@material-ui/core"
import { makeStyles, useTheme, fade } from "@material-ui/core/styles"
import { FolderTwoTone } from "@material-ui/icons"
import { useDrag, useDrop } from "react-dnd"

import useContextMenu from "../hooks/useContextMenu"
import useSettings from "../hooks/useSettings"
import { selectNodes, selectNode } from "../store/dnd"
import { getFavicon, isNodeSelected, setHashParam, isNodeFolder, isNodeBookmark } from "../utils"
import { moveNodesAboveTarget, moveNodesUnderParent, moveNodesBelowTarget } from "../utils/bookmark"
import { handleHoverAndDrop } from "../utils/dnd"
import { BookmarkTreeNode } from "../../types"
import { RootState, HoverArea } from "../types"
import { DNDTypes, __MAC__ } from "../consts"

import BookmarkActionMenu from "./BookmarkActionMenu"
import BookmarkActionMenuContent from "./BookmarkActionMenuContent"
import HoverStateManager from "../hover-state-manager"

const useBookmarkListItemStyle = makeStyles(theme => ({
    container: {
        display: "flex",
        alignItems: "center",
        paddingLeft: theme.spacing(3),
        userSelect: "none",
    },
    icon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: theme.spacing(3),
        height: theme.spacing(3),
    },
    title: {
        flex: 2,
        margin: theme.spacing(0, 2),
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
    },
    url: {
        flex: 1,
        margin: theme.spacing(0, 2),
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        color: fade(theme.palette.text.primary, 0.55),
    },
    actions: {
        justifySelf: "flex-end",
    },
}))

export default function BookmarkTreeItem({ bookmarkNode }: { bookmarkNode: BookmarkTreeNode }) {
    const theme = useTheme()

    const activeFolder = useSelector((state: RootState) => state.bookmark.activeFolder)
    const searchResult = useSelector((state: RootState) => state.bookmark.searchResult)
    const selectedNodes = useSelector((state: RootState) => state.dnd.selectedNodes)
    const dispatch = useDispatch()

    const isFolder = isNodeFolder(bookmarkNode)
    const isBookmark = isNodeBookmark(bookmarkNode)
    const isSelected = isNodeSelected(bookmarkNode, selectedNodes)

    const nodeRef = useRef(createRef<HTMLDivElement>())
    const [, drag] = useDrag({
        item: {
            type: DNDTypes.BookmarkItem,
        },
        begin: () => {
            if (!isSelected) {
                dispatch(selectNode(bookmarkNode))
            }
        },
    })
    const [, drop] = useDrop({
        accept: DNDTypes.BookmarkItem,
        hover: (item, monitor) => {
            const node = nodeRef.current.current
            if (node) {
                HoverStateManager.subscribe({ bookmarkNode, isSelected, node, theme })
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
            if (node && !isSelected) {
                handleHoverAndDrop({
                    node,
                    monitor,
                    top: () => moveNodesAboveTarget(selectedNodes, bookmarkNode),
                    mid: () => moveNodesUnderParent(selectedNodes, bookmarkNode),
                    bottom: () => moveNodesBelowTarget(selectedNodes, bookmarkNode),
                })
            }
            HoverStateManager.reset()
        },
    })
    drag(drop(nodeRef.current))

    useEffect(() => {
        if (isSelected) {
            nodeRef.current.current?.scrollIntoView({
                block: "center",
                behavior: "smooth",
            })
        }
    }, [isSelected, nodeRef.current])

    const { contextMenuProps, handleContextMenuEvent, closeContextMenu } = useContextMenu()

    const { settings } = useSettings()

    const classNames = useBookmarkListItemStyle()

    return (
        <Fragment>
            <div
                ref={nodeRef.current}
                className={classNames.container}
                style={{
                    backgroundColor: isSelected ? fade(theme.palette.primary.main, 0.25) : undefined,
                }}
                // style={{
                //     borderTop:
                //         isHovered && hoverArea === HoverArea.Top
                //             ? `1px solid ${theme.palette.primary.main}`
                //             : undefined,
                //     borderBottom:
                //         isHovered && hoverArea === HoverArea.Bottom
                //             ? `1px solid ${theme.palette.primary.main}`
                //             : undefined,
                //     backgroundColor:
                //         isSelected || (isHovered && hoverArea === HoverArea.Mid)
                //             ? fade(theme.palette.primary.main, 0.25)
                //             : undefined
                // }}
                onClick={e => {
                    e.stopPropagation()

                    if ((!__MAC__ && e.ctrlKey) || (__MAC__ && e.metaKey)) {
                        // if ctrl is pressed (command on mac)
                        if (!isSelected) {
                            // and the current node is not selected, select it
                            dispatch(selectNodes(selectedNodes.concat(bookmarkNode)))
                        } else {
                            // otherwise unselect it
                            dispatch(selectNodes(selectedNodes.filter(node => node.id !== bookmarkNode.id)))
                        }
                    } else if (e.shiftKey) {
                        // if shift is pressed, select all nodes between the first node and the current node, including them
                        // display strategy: searchResult || activeFolder.children

                        const target = searchResult.length > 0 ? searchResult : activeFolder!.children!
                        const firstNodeIndex = target.findIndex(node => node.id === selectedNodes[0].id)
                        const currentNodeIndex = target.findIndex(node => node.id === bookmarkNode.id)
                        dispatch(
                            selectNodes(
                                target.slice(
                                    Math.min(firstNodeIndex, currentNodeIndex),
                                    Math.max(firstNodeIndex, currentNodeIndex) + 1,
                                ),
                            ),
                        )
                    } else {
                        // select current node only
                        dispatch(selectNode(bookmarkNode))
                    }
                }}
                onDoubleClick={e => {
                    e.stopPropagation()

                    if (isFolder) {
                        setHashParam({
                            folder: bookmarkNode.id,
                            search: undefined,
                        })
                    }

                    if (isBookmark) {
                        browser.tabs.create({
                            url: bookmarkNode.url,
                        })
                    }
                }}
                onMouseDown={e => {
                    // in chrome (version: 81) bookmark manager, if user clicks a bookmark using middle mouse button
                    // a new tab will be opened in backgroud (not immediately active)
                    // that bookmark will get selected state exclusively (other selected tabs will be unselected)
                    if (e.button === 1) {
                        // middle mouse button clicked
                        e.preventDefault()

                        if (isBookmark) {
                            browser.tabs.create({
                                url: bookmarkNode.url,
                                active: false,
                            })
                        }

                        dispatch(selectNode(bookmarkNode))
                    }
                }}
                onContextMenu={e => {
                    e.stopPropagation()

                    if (!isSelected) {
                        dispatch(selectNode(bookmarkNode))
                    }

                    handleContextMenuEvent(e)
                }}
            >
                <div className={classNames.icon}>
                    {isFolder && <FolderTwoTone />}
                    {!settings?.disableFavicon && isBookmark && <img src={getFavicon(bookmarkNode.url || "")} />}
                </div>
                <div className={classNames.title} title={bookmarkNode.title}>
                    {bookmarkNode.title}
                </div>
                {(settings?.alwaysShowURL || isSelected) && (
                    <div className={classNames.url} title={bookmarkNode.url}>
                        {bookmarkNode.url}
                    </div>
                )}
                <BookmarkActionMenu className={classNames.actions} bookmarkNode={bookmarkNode} />
            </div>
            <Menu
                {...contextMenuProps}
                onDoubleClick={e => {
                    e.stopPropagation()
                }}
                onContextMenu={e => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
            >
                <BookmarkActionMenuContent onCloseMenu={closeContextMenu} />
            </Menu>
        </Fragment>
    )
}
