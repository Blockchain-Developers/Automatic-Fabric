import React, {  useEffect } from "react";
import { connect } from "react-redux";
import {
    Form,
    FormGroup,
    Label,
    Input,
    ListGroup,
    ListGroupItem,
    Button
} from "reactstrap";
import ErrorMsg from "../Component/ErrorMsgs";
import { useHistory } from "react-router-dom";
import { useFormik } from "formik";
import { update_org_num, set_bar_val } from "../redux/actions";
import * as Yup from "yup";

const validate = Yup.object({
    orgcount: Yup.number()
        .integer("must be a positive integer")
        .positive("must be a positive integer")
        .required("Required")
});
const mapStateToProps = state => ({ orgcount: state.orgcount });
const mapDispatchToProps = dispatch => ({
    step1: () => {
        dispatch(set_bar_val(0));
    },
    update_org_num: val => {
        dispatch(update_org_num(val));
    }
});
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(props => {
    const history = useHistory();
    const formik = useFormik({
        initialValues: {
            orgcount: props.orgcount
        },
        validationSchema: validate,
        onSubmit: values => {
            props.update_org_num(values.orgcount);
            history.push("/orgconfig");
        }
    });
    useEffect(() => {
        props.step1();
    });
    return (
        <ListGroup>
            <Form onSubmit={formik.handleSubmit}>
                <ListGroupItem>
                    <legend>Input Number of orgs</legend>
                </ListGroupItem>
                <ListGroupItem>
                    <FormGroup>
                        <Label for="orgcount">Number of orgs</Label>
                        <Input
                            type="text"
                            name="orgcount"
                            {...formik.getFieldProps("orgcount")}
                        ></Input>
                    </FormGroup>
                    {formik.touched.orgcount && formik.errors.orgcount && (
                        <ErrorMsg message={formik.errors.orgcount} />
                    )}
                </ListGroupItem>
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
            </Form>
        </ListGroup>
    );
});
