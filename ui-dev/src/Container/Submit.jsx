import React from "react";
import { connect } from "react-redux";
import { set_bar_val } from "../redux/actions";
import { useHistory } from "react-router";
import { useEffect } from "react";
import {
    ListGroup,
    ListGroupItem,
    Container,
    Form,
    Button,
    Spinner,
} from "reactstrap";
import { useState } from "react";
//import {useFormik} from 'formik';
const mapDispatchToProps = (dispatch) => ({
    step4: () => {
        dispatch(set_bar_val(100));
    },
});
const mapStateToProps = (state) => ({
    org: state.org,
    ca: state.ca,
    cacount: state.cacount,
    orgcount: state.orgcount,
});
export default connect(
    mapStateToProps,
    mapDispatchToProps
)((props) => {
    const history = useHistory();
    if (props.org.length === 0 || props.ca.length === 0) {
        history.replace("/");
        return <div>redirecting...</div>;
    }
    //const formik = useFormik();
    let displayinfo = {
        org: props.org,
        ca: props.ca,
        cacount: props.cacount,
        orgcount: props.orgcount,
    };
    let [postingdata, setposting] = useState(false);
    useEffect(() => {
        props.step4();
    });
    return (
        <Container>
            <Form>
                <ListGroup>
                    <ListGroupItem>
                        <legend>This is your input data</legend>
                    </ListGroupItem>
                    <ListGroupItem>
                        <pre>{JSON.stringify(displayinfo, null, 2)}</pre>
                    </ListGroupItem>
                    <ListGroupItem>
                        <Button
                            outline
                            block
                            size="lg"
                            color="primary"
                            onClick={() => {
                                setposting(true);
                                fetch("/getconfig", {
                                    body: JSON.stringify(displayinfo),
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    method: "POST",
                                    redirect: "follow",
                                })
                                    .then((response) => {
                                        setposting(false);
                                        return response.json();
                                    })
                                    .then((responseJson) => {
                                        window.location.href =
                                            responseJson.path;
                                    });
                            }}
                        >
                            {postingdata ? (
                                <Spinner color="primary" />
                            ) : (
                                "Are you sure you want to submit ?"
                            )}
                        </Button>
                    </ListGroupItem>
                </ListGroup>
            </Form>
        </Container>
    );
});
