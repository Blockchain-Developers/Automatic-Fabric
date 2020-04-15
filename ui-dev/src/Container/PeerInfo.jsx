import React, { useEffect} from "react";
import { connect } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { set_bar_val, update_peer_info, fill_org } from "../redux/actions";
import { useHistory, useParams } from "react-router";
import { WarnMsg } from "../Component/ErrorMsgs";
import {
    Form,
    FormGroup,
    Label,
    Input,
    Button,
    Container,
    Row,
    Col,
    ListGroup,
    ListGroupItem,
} from "reactstrap";
const validate = Yup.object({
    peer: Yup.array()
        .of(
            Yup.object({
                name: Yup.string().required("Required"),
                port: Yup.number()
                    .positive()
                    .integer()
                    .required("please input a positive integer"),
            })
        )
        .required("Required"),
});
const mapDispatchToProps = (dispatch) => ({
    step3: () => dispatch(set_bar_val(50)),
    update_peer_info: (info) => dispatch(update_peer_info(info)),
    fill_org: (orgid) => dispatch(fill_org(orgid)),
});
const mapStateToProps = (state) => ({
    org: state.org,
});
export default connect(
    mapStateToProps,
    mapDispatchToProps
)((props) => {
    const history = useHistory();
    //make sure user input orgconfig already
    if (!props.org || props.org.length === 0) {
        history.replace("/");
        return <div>redirecting...</div>;
    }
    useEffect(() => {
        props.step3();
    });
    const initialValues = {
        peer: [],
    };
    const { orgid } = useParams();
    const curorg = orgid;
    //already input value, recover previous, otherwise empty string
    for (let j = 0; j < props.org[orgid].peercount; j++) {
        initialValues.peer.push({
            name:
                props.org[orgid].peer && props.org[orgid].peer[j]
                    ? props.org[orgid].peer[j].name
                    : "",
            port:
                props.org[orgid].peer && props.org[orgid].peer[j]
                    ? props.org[orgid].peer[j].port
                    : "",
        });
    }

    const formik = useFormik({
        initialValues,
        validationSchema: validate,
        onSubmit: (value) => {
            props.update_peer_info({ peer: value.peer, orgid });
            props.fill_org(orgid);
            history.push("/orglist");
        },
    });
    let InputFields = [];
    for (let i = 0; i < props.org[curorg].peercount; i++) {
        InputFields.push(
            <ListGroupItem key={i}>
                <FormGroup>
                    <Label for={`peer[${i}].name`}>name for peer{i}</Label>
                    <Input
                        type="text"
                        name={`peer[${i}].name`}
                        {...formik.getFieldProps(`peer[${i}].name`)}
                    />
                </FormGroup>
                <FormGroup>
                    <Label for={`peer[${i}].port`}>port of peer{i}</Label>
                    <Input
                        type="text"
                        name={`peer[${i}].port`}
                        {...formik.getFieldProps(`peer[${i}].port`)}
                    />
                </FormGroup>
            </ListGroupItem>
        );
    }
    // check input of every org is valid(not empty and not garbage)
    let allinputvalid = true;
    for (let j = 0; j < props.org[orgid].peercount; j++) {
        if (
            (!formik.touched.peer ||
            !formik.touched.peer[j] ||
            formik.errors.peer) && !props.org[orgid].peer
        ) {
            allinputvalid = false;
            break;
        }
    }
    return (
        <Container>
            <Row>
                <Col>
                    <Form onSubmit={formik.handleSubmit}>
                        <ListGroup>
                            <ListGroupItem>
                                <legend>
                                    {`Input config for ${props.org[curorg].name}`}
                                </legend>
                            </ListGroupItem>
                            {InputFields}
                            <ListGroupItem>
                                <Button
                                    disabled={!allinputvalid}
                                    outline
                                    block
                                    size="lg"
                                    color={
                                        allinputvalid ? "primary" : "secondary"
                                    }
                                    tag="button"
                                    type="submit"
                                >
                                    Next
                                </Button>
                                {!allinputvalid && formik.touched.peer && (
                                    <WarnMsg
                                        message={
                                            "some inputs are invalid or empty"
                                        }
                                    />
                                )}
                            </ListGroupItem>
                        </ListGroup>
                    </Form>
                </Col>
            </Row>
        </Container>
    );
});
