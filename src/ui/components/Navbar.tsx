import React, { useEffect } from "react"
import {
    makeStyles,
    fade,
    AppBar,
    Toolbar,
    Typography,
    InputBase
} from "@material-ui/core"
import { Search } from "@material-ui/icons"
import debounce from "lodash/debounce"

import { useStore } from "../Store"

const useNavbarStyle = makeStyles(theme => ({
    appBar: {
        backgroundColor:
            theme.palette.type === "dark"
                ? theme.palette.background.default
                : undefined
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
    },
    search: {
        position: "relative",
        borderRadius: theme.shape.borderRadius,
        backgroundColor: fade(theme.palette.common.white, 0.15),
        "&:hover": {
            backgroundColor: fade(theme.palette.common.white, 0.25)
        },
        marginRight: theme.spacing(2),
        marginLeft: 0,
        width: "100%",
        [theme.breakpoints.up("sm")]: {
            marginLeft: theme.spacing(3),
            width: "auto"
        }
    },
    searchIcon: {
        width: theme.spacing(7),
        height: "100%",
        position: "absolute",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },
    inputRoot: {
        color: "inherit"
    },
    inputInput: {
        padding: theme.spacing(1, 1, 1, 7),
        transition: theme.transitions.create("width"),
        width: "100%",
        [theme.breakpoints.up("md")]: {
            width: 200
        }
    }
}))

const SEARCH_INPUT_ID = "SEARCH_INPUT"

const Navbar: React.FC = () => {
    const classNames = useNavbarStyle()

    const { searchInput, search } = useStore()

    // somehow, the change event' values are all null
    useEffect(() => {
        const input = document.getElementById(
            SEARCH_INPUT_ID
        ) as HTMLInputElement

        const handleChange = debounce(() => {
            search(input.value)
        }, 500)

        const handleEnter = (e: HTMLElementEventMap["keydown"]) => {
            if (e.key === "Enter") {
                handleChange()
            }
        }

        input.addEventListener("change", handleChange)
        input.addEventListener("keydown", handleEnter)

        return () => {
            input.removeEventListener("change", handleChange)
            input.removeEventListener("keydown", handleEnter)
        }
    }, [searchInput, search])

    return (
        <AppBar className={classNames.appBar} position="static">
            <Toolbar className={classNames.toolbar}>
                <Typography>Bookmark Manager</Typography>
                <div className={classNames.search}>
                    <div className={classNames.searchIcon}>
                        <Search />
                    </div>
                    <InputBase
                        autoFocus
                        id={SEARCH_INPUT_ID}
                        placeholder="Search here"
                        classes={{
                            root: classNames.inputRoot,
                            input: classNames.inputInput
                        }}
                        defaultValue={searchInput}
                    />
                </div>
            </Toolbar>
        </AppBar>
    )
}

export default Navbar
