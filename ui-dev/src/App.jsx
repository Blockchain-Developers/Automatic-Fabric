import React from "react";
import "./App.css";
import { Container, Col, Row, Progress } from "reactstrap";
import Form from "./Container/OrgCount";
import { Route, BrowserRouter, Switch, NavLink } from "react-router-dom";
import OrgInput from "./Container/OrgInfo";
import { connect } from "react-redux";
import PeerInput from "./Container/PeerInfo";
import CaInput from "./Container/CaInfo";
import Submit from "./Container/Submit";
import Orglist from "./Container/OrgList";
const mapStateToProps = (state) => ({
    barVal: state.barvalue,
});
function App(props) {
    return (
        <BrowserRouter>
            <Progress value={props.barVal} />
            <Container>
                <Row style={{ padding: "2em" }}>
                    <Col
                        lg={{ size: 8, offset: 2 }}
                        md="12"
                        style={{ textAlign: "center" }}
                    >
                        <h1>
                            <NavLink
                                to="/"
                                style={{
                                    textDecoration: "none",
                                    color: "black",
                                }}
                            >
                                Automatic yaml config generator
                            </NavLink>
                        </h1>
                    </Col>
                </Row>
                <Row>
                    <Col md="12" lg={{ size: 6, offset: 3 }}>
                        <Switch>
                            <Route exact path="/" component={Form} />
                            <Route
                                exact
                                path="/orgconfig"
                                component={OrgInput}
                            />
                            <Route
                                path="/peerconfig/:orgid"
                                component={PeerInput}
                            />
                            <Route exact path="/caconfig" component={CaInput} />
                            <Route exact path="/submit" component={Submit} />
                            <Route exact path="/orglist" component={Orglist} />
                        </Switch>
                    </Col>
                </Row>
            </Container>
        </BrowserRouter>
    );
}

export default connect(mapStateToProps, null)(App);
