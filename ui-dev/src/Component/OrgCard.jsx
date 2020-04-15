import React from "react";
import { Card, CardBody, CardTitle, CardText, Button } from "reactstrap";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
const mapStateToProps = (state) => ({
    filled: (orgid) => state.filled_org[orgid],
});
export default connect(
    mapStateToProps,
    null
)((props) => {
    let history = useHistory();
    return (
        <Card style={{ margin: "1em" }}>
            <CardBody
                tag={Button}
                outline
                color={props.filled(props.orgid) ? "info" : "danger"}
                onClick={() => {
                    history.push(`/peerconfig/${props.orgid}`);
                }}
            >
                <CardTitle>
                    <h1>{props.org.name}</h1>
                </CardTitle>
                <CardText>       
                        peers:<br/>
                        {props.org.peercount}                  
                </CardText>
                <CardText>
                        orderer port:<br/>
                        {props.org.orderer.port}
                </CardText>
            </CardBody>
        </Card>
    );
});
