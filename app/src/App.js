import React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link';
import InputIcon from '@mui/icons-material/Input';
import Button from "@mui/material/Button";
import {useState, useEffect, Fragment} from 'react';
import axios from 'axios';
import {MeteorRainLoading} from 'react-loadingg';

import k8s from './k8s_details';

let apiUrl = "http://localhost:8000/";
if (process.env?.REACT_APP_API_URL) {
    apiUrl = process.env.REACT_APP_API_URL;
}
console.log("Using API", apiUrl);

function App() {

    // keep query inital state as empty string as to not hit the API with a dumb, unnessary request.
    const [query, setQuery] = useState("");
    const [textBoxQuery, setTextBoxQuery] = useState("");
    const [k8sVersion, setk8sVersion] = useState(false);
    const [details, setDetails] = useState("");
    const [example, setExample] = useState("");
    const [showExample, setShowExample] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resources, setResources] = useState([]);
    const [requiredList, setRequiredList] = useState([]);
    const [autocomplete, setAutocomplete] = useState([]);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [resourceVersion, setResourceVersion] = useState(false);
    const [displayedResourceVersion, setDisplayedResourceVersion] = useState("");
    const [availableVersions, setAvailableVersions] = useState([]);

    useEffect(() => {
        function setPathStates() {
            if (window.location.pathname === "/") {
                // Handle naked domais
                setk8sVersion(k8s.choices.indexOf(k8s.default))
                window.history.pushState(null, null, `/${k8s.default}/`)
            } else {
                // handle correct URL's
                const pathArr = window.location.pathname.split("/");
                if (pathArr.length === 3) {
                    setQuery(pathArr[2])
                    setTextBoxQuery(pathArr[2])
                    if (k8s.choices.includes(pathArr[1])) {
                        setk8sVersion(k8s.choices.indexOf(pathArr[1]));
                        window.history.pushState(null, null, `/${pathArr[1]}/${pathArr[2]}`)
                    } else {
                        setk8sVersion(k8s.choices.indexOf(k8s.default))
                        window.history.pushState(null, null, `/${k8s.default}/${pathArr[2]}`)
                    }
                } else if (pathArr.length === 4) {
                    setQuery(pathArr[2])
                    setTextBoxQuery(pathArr[2])
                    if (k8s.choices.includes(pathArr[1])) {
                        setk8sVersion(k8s.choices.indexOf(pathArr[1]));
                        setResourceVersion(pathArr[3])
                        setDisplayedResourceVersion(pathArr[3]);
                        window.history.pushState(null, null, `/${pathArr[1]}/${pathArr[2]}/${pathArr[3]}`)
                    } else {
                        setk8sVersion(k8s.choices.indexOf(k8s.default))
                        setResourceVersion(pathArr[3])
                        setDisplayedResourceVersion(pathArr[3]);
                        window.history.pushState(null, null, `/${k8s.default}/${pathArr[2]}/${pathArr[3]}`)
                    }
                } else {
                    if (k8s.choices.includes(pathArr[1])) {
                        setk8sVersion(k8s.choices.indexOf(pathArr[1]));
                        window.history.pushState(null, null, `/${pathArr[1]}/`)
                    } else {
                        setk8sVersion(k8s.choices.indexOf(k8s.default))
                        window.history.pushState(null, null, `/${k8s.default}/`)
                    }
                }
            }
        }

        setPathStates();
        window.onpopstate = () => {
            //TODO: Theres a bug here where you sometimes have to push the browser back button twice to actually go back.
            setPathStates();
        };
    }, []);

    useEffect(() => {
        const search = async () => {
            setLoading(true);
            setError("");
            setDetails("");
            setExample("");
            setShowExample(false);
            setResources([]);
            setAvailableVersions([]);

            if (query !== "") {
                let searchUrl = `${apiUrl}search/${k8s.choices[k8sVersion]}/${query}`;
                const versionsReq = axios.get(searchUrl.replace("/search/", "/resourceversions/"));

                if(resourceVersion){
                    searchUrl = searchUrl + `/${resourceVersion}`;
                }

                const detailReq = axios.get(searchUrl);
                const exampleReq = axios.get(`${apiUrl}examples/${k8s.choices[k8sVersion]}/${query}`);

                // handle detail request
                try {
                    const response = await detailReq;
                    setDetails(response.data);
                    if (response.data?.required) {
                        setRequiredList(response.data.required);
                    }
                } catch (error) {
                    if (error?.response?.data?.detail) {
                        setDetails("")
                        setError(error.response.data.detail);
                    }
                }

                // handle examples request
                try {
                    const response = await exampleReq;
                    if(response?.data?.result){
                        setExample(response.data);
                    }
                } catch (error) {
                    // Ignore any errors
                }

                // handle versions request
                try {
                    const response = await versionsReq;
                    if(response?.data && response?.data.length > 1){
                        setAvailableVersions(response.data);
                    }
                } catch (error) {
                    // Ignore any errors
                }

            } else {
                try {
                    const response = await axios.get(`${apiUrl}resources/${k8s.choices[k8sVersion]}`);
                    setResources(response.data);
                    const productVersion = k8s.choices[k8sVersion].split("-");
                    setDetails({"description": `Available resources for ${productVersion[0]} version ${productVersion[1]}\n
                    The searchbox above supports all resources in the ${productVersion[0]} openAPI spec, even if a resource is not listed here.`})
                } catch (error) {
                    if (error?.response?.data?.detail) {
                        setDetails("")
                        setError(error.response.data.detail);
                    }
                }
            }

            let windowHistory = `/${k8s.choices[k8sVersion]}/${query}`;
            if(resourceVersion) {
                windowHistory = windowHistory + `/${resourceVersion}`;
            }
            window.history.pushState(null, null, windowHistory)
            setLoading(false);
        };

        if(k8sVersion !== false){
            search();
        }
    }, [query, k8sVersion, resourceVersion]);

    useEffect(() => {
        const getAutoComplete = async () => {
            setAutocompleteLoading(true);
            const searchStr = textBoxQuery.endsWith(".") ? textBoxQuery.slice(0, -1) : textBoxQuery;
            const response = await axios.get(`${apiUrl}keys/${k8s.choices[k8sVersion]}/${searchStr}`);
            if(response.data.length !== 0){
                setAutocomplete(response.data);
            }
            setAutocompleteLoading(false);
        };

        const timeOutId = setTimeout(async () => {
            if (textBoxQuery !== "") {
                await getAutoComplete();
            }
        }, 1000);
        return () => clearTimeout(timeOutId);
    }, [textBoxQuery, k8sVersion])

    const renderDetails = () => {
        let rows = [];
        if (query !== "" && details?.properties) {
            for (const [key, value] of Object.entries(details.properties)) {
                let result = {"title": key, "links": value.hasOwnProperty("properties")};

                result["required"] = !!requiredList.includes(key);

                if (value?.description) {
                    result["description"] = value.description.split('\n').map((str, index) => {
                        const desc = str.split("More info: ")

                        let link = "";
                        if(desc.length === 2){
                            link = <a href={desc[1]}>More Info</a>
                        }

                        return <p key={index}>{desc[0]} {link}</p>
                    })
                }

                if (value?.type) {
                    result["type"] = value.type;
                    if (value?.subtype && ["array", "object"].includes(value.type)) {
                        result["type"] = `${value.type.replace("object", "").replace("array", "[]")}${value.subtype}`
                    } else if(value?.items?.type) {
                        result["type"] = `${value.type.replace("object", "").replace("array", "[]")}${value.items.type}`
                    }

                    if(value?.enum) {
                        result["type"] = (
                            <div>
                                Enum: {value.enum.map((str, index) => <div key={index}>&nbsp;&nbsp;- {str}</div>)}
                            </div>
                        )
                    }

                }

                rows.push(result)
            }
        } else {
            for(const resource of resources){
                rows.push({"title": resource.resource, "links": true, "description": resource.description.split('\n')});
            }
        }
        return rows;
    };

    const renderBottom = () => {
        if (error !== "") {
            return (
                <div style={{textAlign: "center"}}>
                    <p>{error}</p>
                    <p>If you think this error was thrown... in error... let me know!</p>
                    <p style={{fontWeight: "bold"}}>Open an issue on <a
                        href="https://github.com/Apollorion/manifests.io/issues/new">github</a>!</p>
                </div>
            )
        } else {
            return (
                <TableContainer>
                    <Table aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Item</b></TableCell>
                                <TableCell><b>Description</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {renderDetails().map((row) => (
                                <TableRow key={row.title}>
                                    <TableCell component="th" scope="row">
                                        <span style={{whiteSpace: "nowrap"}}><b>{renderCellTitle(row)}</b></span>
                                    </TableCell>
                                    <TableCell>{row.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )
        }
    }

    const navigateToItem = (row) => {
        if (row?.links) {
            if(query === ""){
                setQuery(`${row.title}`);
            } else {
                setQuery(`${query}.${row.title}`);
            }
            setDetails("");
        }
    };

    const renderCellTitle = (row) => {
        let type = "";
        if (row?.type) {
            type = row.type
        }

        const CustomLink = row?.links ? Link : "span"
        const CustomInputIcon = row?.links ? InputIcon : "span";

        let title = (
            <div>
                <CustomLink onClick={() => navigateToItem(row)} component="button"
                            style={{fontWeight: "bold", color: "black"}}>
                    {row.title} <CustomInputIcon fontSize="xxsmall" style={{marginBottom: -2}}/>
                </CustomLink>
                <br/>
                <span style={{fontSize: "8pt", fontWeight: "normal"}}>
                    {type}
                </span>
            </div>
        );

        if (row.required) {
            title = (
                <div>
                    <CustomLink onClick={() => navigateToItem(row)} component="button"
                                style={{fontWeight: "bold", color: "black"}}>
                        {row.title} <CustomInputIcon fontSize="xxsmall" style={{marginBottom: -2}}/>
                    </CustomLink>
                    <br/>
                    <span style={{fontSize: "8pt", fontWeight: "normal"}}>
                        {type}
                    </span>
                    <span style={{color: 'red'}}>
                        *
                    </span>
                </div>
            );
        }
        return title;
    };

    const renderTitle = () => {
        if (details?.gvk) {
            return details.gvk.kind
        }
    };

    const renderGVK = () => {
        if (details["gvk"] && details["gvk"].version) {
            let apiVersion = details["gvk"].version;
            if (details["gvk"].group !== undefined && details["gvk"].group !== "") {
                apiVersion = `${details["gvk"].group}/${apiVersion}`
            }
            apiVersion = apiVersion.trim();

            return (
                <div style={{display: "flex", flexDirection: "row", margin: "auto", width: "fit-content"}}>
                    <div style={{textAlign: "left", marginRight: "50px", whiteSpace: "nowrap"}}>
                        <b>apiVersion:</b> {apiVersion}<br />
                        <b>kind:</b> {details["gvk"].kind}
                    </div>
                    {renderExampleButton()}
                </div>
            )
        }
        return renderExampleButton()
    }

    const renderExampleButton = () => {
        if (example !== "") {
            return (
                <div>
                    <Button
                        variant="outlined"
                        onClick={() => setShowExample(!showExample)}
                        style={{whiteSpace: "nowrap"}}
                    >
                        {showExample ? "Hide" : "Show"} Example
                    </Button>
                </div>
            )
        }
    };

    const renderVersionsList = () => {
        if (availableVersions.length > 0) {
            if(displayedResourceVersion === ""){
                setDisplayedResourceVersion(availableVersions[0]);
            }

            return (
                <TextField
                    select
                    sx={{width: '20ch'}}
                    id="version-select"
                    value={availableVersions[availableVersions.indexOf(displayedResourceVersion)]}
                    variant="standard"
                    label="resource version"
                    onChange={(event) => {
                        setResourceVersion(event.target.value);
                        setDisplayedResourceVersion(event.target.value)
                    }}
                >
                    {availableVersions.map((item, index) => {
                        return <MenuItem key={index} value={item}>{item}</MenuItem>
                    })}
                </TextField>
            )
        }
    };

    const renderExample = () => {
        if (showExample) {
            return (
                <div>
                    <div style={{width: "fit-content", margin: "auto", textAlign: "left"}}>
                        <div>
                            <pre style={{display: "inline-block", border: "1px solid black", padding: "10px"}}>
                                {example.result}
                            </pre>
                        </div>
                        <div style={{textAlign: "center"}}>
                            <span style={{fontSize: "xx-small"}}>Example via <a href={example.source}>{example.text}</a></span>
                        </div>
                    </div>
                </div>
            )
        }
    }

    const renderDescription = () => {
        if (details?.description) {
            return details.description.split('\n').map((str, index) => {
                const desc = str.split("More info: ")

                let link = "";
                if(desc.length === 2){
                    link = <a href={desc[1]}>More Info</a>
                }

                return <p key={index}>{desc[0]} {link}</p>
            })
        }
    };

    const renderIssueLink = () => {
        return (
            <div style={{textAlign: "center", marginTop: "50px", marginBottom: "50px"}}>
                <a href={`https://github.com/Apollorion/manifests.io/issues/new?title=Issue%20on%20page${encodeURIComponent(` ${k8s.choices[k8sVersion]}/${query}`)}&body=%23%23%20Description%20of%20issue%0A`}>See an issue here?</a> | <a href="https://status.manifests.io/">Status</a>
            </div>
        )
    };

    if (loading) {
        return <div style={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", flexDirection: "column"}}>
            <h1>Searching...</h1>
            <br />
            <MeteorRainLoading size="large" style={{display: "block"}}/>
            <br />
            {renderIssueLink()}
        </div>
    }

    return (
        <div className="App" style={{marginBottom: "50px"}}>
            <div style={{textAlign: "center", marginTop: "50px", marginBottom: "50px"}}>
                K8s Is Awesome. Made with ❤, <a
                href="https://github.com/apollorion/manifests.io">apollorion</a>.<br/><br/>
                <div style={{flexDirection: "row", justifyContent: "center"}}>
                    <FormControl style={{flexDirection: "row"}}>
                        <TextField
                            select
                            sx={{width: '20ch'}}
                            id="k8s-select"
                            value={k8sVersion}
                            variant="standard"
                            label="k8s/product version"
                            onChange={(event) => {
                                setk8sVersion(event.target.value);
                            }}
                        >
                            {k8s.choices.map((item, index) => {
                                return <MenuItem key={index} value={index}>{item}</MenuItem>
                            })}
                        </TextField>
                        <Autocomplete
                            // This autocomplete has an annoying bug where deleted text is searched if there is a match
                            // https://github.com/mui-org/material-ui/issues/27137
                            // Hopefully it is corrected soon and we can get that fix in here.
                            id="search"
                            value={query}
                            onChange={(event, value) => {
                                setResourceVersion(false);
                                setQuery(value === null ? "" : value)
                            }}
                            inputValue={textBoxQuery}
                            onInputChange={(event, value) => {
                                if(value !== null){
                                    setTextBoxQuery(value)
                                }
                            }}
                            sx={{width: '50ch'}}
                            freeSolo
                            options={autocomplete}
                            renderInput={(params) => {
                                return (<TextField {...params}
                                                   variant="standard"
                                                   label="search"
                                                   placeholder="<resource>.<fieldPath>.[<fieldPath>]"
                                                   InputProps={{
                                                       ...params.InputProps,
                                                       endAdornment: (
                                                           <Fragment>
                                                               {autocompleteLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                               {params.InputProps.endAdornment}
                                                           </Fragment>
                                                       ),
                                                   }}
                                />);
                            }}
                        />
                        {renderVersionsList()}
                    </FormControl>
                </div>
            </div>
            <div>
                <div style={{textAlign: "center"}}>
                    <h4>{renderTitle()}</h4>
                    {renderGVK()}
                    {renderDescription()}
                    {renderExample()}
                </div>
                {renderBottom()}
            </div>
            {renderIssueLink()}
        </div>
    );
}

export default App;
