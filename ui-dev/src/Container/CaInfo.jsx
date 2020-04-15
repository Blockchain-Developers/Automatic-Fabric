import React, { useEffect } from "react";
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
import { set_bar_val, update_ca_info } from "../redux/actions";
import * as Yup from "yup";

const validate = Yup.object({
    ca: Yup.array()
        .of(
            Yup.object({
                name: Yup.string().required("Required"),
                port: Yup.number()
                    .positive("must be a positive integer")
                    .integer("must be a positive integer")
                    .required("Required")
            })
        )
        .required("Required")
});

const CaInputField = props => {
    let caOrder = props.caOrder;
    const formik = props.formik;
    return (
        <ListGroupItem>
            <FormGroup>
                <Row>
                    <Col>
                        <Label for={`ca[${caOrder}].name`}>
                            ca{caOrder} Name
                        </Label>
                        <Input
                            type="text"
                            name={`ca[${caOrder}].name`}
                            {...formik.getFieldProps(`ca[${caOrder}].name`)}
                        />
                        {formik.touched.ca &&
                            formik.touched.ca[caOrder] &&
                            formik.touched.ca[caOrder].name &&
                            formik.errors.ca &&
                            formik.errors.ca[caOrder] &&
                            formik.errors.ca[caOrder].name && (
                                <ErrorMsg
                                    message={formik.errors.ca[caOrder].name}
                                />
                            )}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Label for={`ca[${caOrder}].port`}>
                            Port of ca{caOrder}
                        </Label>
                        <Input
                            type="text"
                            name={`ca[${caOrder}].port`}
                            {...formik.getFieldProps(
                                `ca[${caOrder}].port`
                            )}
                        />
                        {formik.touched.ca &&
                            formik.touched.ca[caOrder] &&
                            formik.touched.ca[caOrder].port &&
                            formik.errors.ca &&
                            formik.errors.ca[caOrder] &&
                            formik.errors.ca[caOrder].port && (
                                <ErrorMsg
                                    message={
                                        formik.errors.ca[caOrder].port
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
    step3: () => {
        dispatch(set_bar_val(75));
    },
    update_ca_info: (info)=>{
        dispatch(update_ca_info(info))
    }
});
const mapStateToProps = state => ({
    cacount: state.cacount,
    ca: state.ca
});
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(props => {
    const history = useHistory();
    //make sure that user input canum already
    if (props.cacount === 0) {
        history.replace("/");
        return <div>redirecting...</div>;
    }

    const initialValues = {
        ca: []
    };
    if (!props.ca) {
        for (let i = 0; i < props.cacount; i++) {
            initialValues.ca.push({
                name: "",
                port: ""
            });
        }
    } else {
        initialValues.ca = props.ca;
    }
    const formik = useFormik({
        initialValues,
        validationSchema: validate,
        onSubmit: info => {
            //console.log(props.ca);
            //console.log(info);
            props.update_ca_info(info.ca);
            history.push("/submit");
        }
    });
    useEffect(() => {
        props.step3();
    });
    let caList = [];
    for (let i = 0; i < props.cacount; i++) {
        caList.push(<CaInputField key={i} caOrder={i} formik={formik} />);
    }
    return (
        <Container fluid>
            <Form onSubmit={formik.handleSubmit}>
                <ListGroup>
                    <Row>
                        <Col>
                            <ListGroup>
                                <ListGroupItem>
                                    <legend>Enter Ca configs</legend>
                                </ListGroupItem>
                                {caList}
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
