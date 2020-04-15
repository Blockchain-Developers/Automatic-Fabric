import React from "react";
import { Col, Row, Container, Button } from "reactstrap";
import OrgCard from "../Component/OrgCard";
import { connect } from "react-redux";
import { useHistory } from "react-router";

const Cards = (props) => {
    let orgcount = props.orgcount;
    let cardlist = [];
    for (let i = 0; i < orgcount; i++) {
        cardlist.push(
            <Col sm="12" lg="6" key={i}>
                <OrgCard
                    org={props.org[i]}
                    orgid={i}
                />
            </Col>
        );
    }
    return cardlist;
};
const mapStateToProps = (state) => ({
    orgcount: state.orgcount,
    org: state.org,
    currentState: state.filled_org
});
export default connect(
    mapStateToProps,
    null
)((props) => {
    const history = useHistory();
    if (!props.org || props.orgcount === 0) {
        history.replace("/orgconfig");
        return <div>redirecting...</div>;
    }
    const currentState = props.currentState;
    let alldone = true;
    for (let i = 0;i< props.orgcount;i++) {
        if (currentState[i] === false) {
            alldone = false;
            break;
        }
    }
    return (
        <Container>
            <Row>
                <Cards
                    orgcount={props.orgcount}
                    org={props.org}
                />
            </Row>
            <Row>
                <Col>
                    <Button
                        block
                        size="lg"
                        color={alldone ? "primary" : "secondary"}
                        outline
                        disabled={!alldone}
                        onClick={()=>{
                            history.push("/caconfig")
                        }}
                    >
                        Next
                    </Button>
                </Col>
            </Row>
        </Container>
    );
});
