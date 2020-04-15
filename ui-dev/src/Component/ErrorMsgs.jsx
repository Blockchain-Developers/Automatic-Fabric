import React from 'react';
import {Alert} from 'reactstrap';

const ErrorMsg = props =>{
    return <Alert color="danger">{props.message}</Alert>;
}
const WarnMsg = props =>{
    return <Alert color="warning">{props.message}</Alert>
}
export {WarnMsg};
export default ErrorMsg;