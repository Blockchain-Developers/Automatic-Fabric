import {
    UPDATE_ORG_NUM,
    UPDATE_PEER_INFO,
    UPDATE_ORG_INFO,
    UPDATE_CA_INFO,
    SET_BAR_VAL,
    FILL_ORG,
} from "./action-types";
export function update_org_num(payload) {
    return { type: UPDATE_ORG_NUM, payload };
}
export function update_org_info(payload) {
    return { type: UPDATE_ORG_INFO, payload };
}
export function set_bar_val(payload) {
    return { type: SET_BAR_VAL, payload };
}
export function update_peer_info(payload) {
    return { type: UPDATE_PEER_INFO, payload };
}
export function update_ca_info(payload) {
    return { type: UPDATE_CA_INFO, payload };
}
export function fill_org(payload) {
    return { type: FILL_ORG, payload };
}
