import React, {  useEffect } from "react";
import { connect } from "react-redux";
import {
    Form,
    FormGroup,
    Label,
    Input,
    ListGroup,
    ListGroupItem,
    Container,
    Row,
    Col,
    Button
} from "reactstrap";
import { useHistory } from "react-router";
import { useFormik } from "formik";
import ErrorMsg from "../Component/ErrorMsgs";
import { set_bar_val, update_org_info } from "../redux/actions";
import * as Yup from "yup";

const validate = Yup.object({
    org: Yup.array()
        .of(
            Yup.object({
                name: Yup.string().required("Required"),
                peercount: Yup.number()
                    .positive("must be a positive integer")
                    .integer("must be a positive integer")
                    .required("Required"),
                orderer: Yup.object({
                    port: Yup.number()
                        .positive("must be a positive integer")
                        .integer("must be a positive integer")
                        .required("Required")
                })
            })
        )
        .required("Required")
});

const OrgInputField = props => {
    let orgOrder = props.orgOrder;
    const formik = props.formik;
    return (
        <ListGroupItem>
            <FormGroup>
                <Row>
                    <Col>
                        <Label for={`org[${orgOrder}].name`}>
                            Org{orgOrder} Name
                        </Label>
                        <Input
                            type="text"
                            name={`org[${orgOrder}].name`}
                            {...formik.getFieldProps(`org[${orgOrder}].name`)}
                        />
                        {formik.touched.org &&
                            formik.touched.org[orgOrder] &&
                            formik.touched.org[orgOrder].name &&
                            formik.errors.org &&
                            formik.errors.org[orgOrder] &&
                            formik.errors.org[orgOrder].name && (
                                <ErrorMsg
                                    message={formik.errors.org[orgOrder].name}
                                />
                            )}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Label for={`org[${orgOrder}].peercount`}>
                            Number of Peers of Org{orgOrder}
                        </Label>
                        <Input
                            type="text"
                            name={`org[${orgOrder}].peercount`}
                            {...formik.getFieldProps(
                                `org[${orgOrder}].peercount`
                            )}
                        />
                        {formik.touched.org &&
                            formik.touched.org[orgOrder] &&
                            formik.touched.org[orgOrder].peercount &&
                            formik.errors.org &&
                            formik.errors.org[orgOrder] &&
                            formik.errors.org[orgOrder].peercount && (
                                <ErrorMsg
                                    message={
                                        formik.errors.org[orgOrder].peercount
                                    }
                                />
                            )}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Label for={`org[${orgOrder}].orderer.port`}>
                            Orderer Port of Org{orgOrder}
                        </Label>
                        <Input
                            type="text"
                            name={`org[${orgOrder}].orderer.port`}
                            {...formik.getFieldProps(
                                `org[${orgOrder}].orderer.port`
                            )}
                        />
                        {formik.touched.org &&
                            formik.touched.org[orgOrder] &&
                            formik.touched.org[orgOrder].orderer &&
                            formik.errors.org &&
                            formik.errors.org[orgOrder] &&
                            formik.errors.org[orgOrder].orderer && (
                                <ErrorMsg
                                    message={
                                        formik.errors.org[orgOrder].orderer.port
                                    }
                                />
                            )}
                    </Col>
                </Row>
            </FormGroup>
        </ListGroupItem>
    );
};

const mapDispatchToProps = dispatch => ({
    step2: () => {
        dispatch(set_bar_val(25));
    },
    update_org_info: info => {
        dispatch(update_org_info(info));
    }
});
const mapStateToProps = state => ({
    orgcount: state.orgcount,
    org: state.org
});
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(props => {
    const history = useHistory();
    //make sure that user input orgnum already
    if (props.orgcount === 0) {
        history.replace("/");
        return <div>redirecting...</div>;
    }

    const initialValues = {
        org: []
    };
    if (!props.org) {
        for (let i = 0; i < props.orgcount; i++) {
            initialValues.org.push({
                name: "",
                peercount: "",
                orderer: {
                    port: ""
                }
            });
        }
    } else {
        initialValues.org = props.org;
    }
    const formik = useFormik({
        initialValues,
        validationSchema: validate,
        onSubmit: info => {
            //console.log(props.org);
            //console.log(info);
            props.update_org_info(info.org);
            history.push("/orglist");
        }
    });
    useEffect(() => {
        props.step2();
    });
    let orgList = [];
    for (let i = 0; i < props.orgcount; i++) {
        orgList.push(<OrgInputField key={i} orgOrder={i} formik={formik} />);
    }

    //ref.current[i].value to get value
    return (
        <Container fluid>
            <Form onSubmit={formik.handleSubmit}>
                <ListGroup>
                    <Row>
                        <Col>
                            <ListGroup>
                                <ListGroupItem>
                                    <legend>Input Org config</legend>
                                </ListGroupItem>
                                {orgList}
                            </ListGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <ListGroupItem>
                                <Button
                                    outline
                                    block
                                    size="lg"
                                    color="primary"
                                    tag="button"
                                    type="submit"
                                >
                                    Next
                                </Button>
                            </ListGroupItem>
                        </Col>
                    </Row>
                </ListGroup>
            </Form>
        </Container>
    );
});
