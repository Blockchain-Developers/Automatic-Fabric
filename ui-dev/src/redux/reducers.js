import {
    UPDATE_ORG_NUM,
    UPDATE_ORG_INFO,
    SET_BAR_VAL,
    UPDATE_PEER_INFO,
    UPDATE_CA_INFO,
    FILL_ORG,
} from "./action-types";
const initialState = {
    orgcount: 0,
    org: [],
    cacount: 0,
    ca: [],
    barvalue: 0,
    filled_org: [],
};
function rootReducer(state = initialState, action) {
    switch (action.type) {
        case UPDATE_ORG_NUM:
            return {
                ...state,
                orgcount: action.payload,
                cacount: action.payload,
                filled_org: Array(parseInt(action.payload)).fill(
                    false,
                    0,
                    action.payload
                ),
            };
        case UPDATE_ORG_INFO:
            return {
                ...state,
                org: action.payload,
            };
        case UPDATE_PEER_INFO:
            var neworgs = JSON.parse(JSON.stringify(state.org));
            neworgs[action.payload.orgid].peer = action.payload.peer;
            return { ...state, org: neworgs };
        case UPDATE_CA_INFO:
            return { ...state, ca: action.payload };
        case SET_BAR_VAL:
            return { ...state, barvalue: action.payload };
        case FILL_ORG:
            return {
                ...state,
                filled_org: state.filled_org.map((filled, orgid) => {
                    if (orgid === parseInt(action.payload)) {
                        return true;
                    } else {
                        return filled;
                    }
                }),
            };
        default:
            return state;
    }
}
export default rootReducer;
//output state to backend
/*
{
orgcount
org[
    {
      name,
      peercount,
      peer[
        {
          name,
          port
        },
      ],
      orderer{
        port
      },
    }
  ],
cacount,
ca[
    name,
    port
  ]
}
*/
