import assert from "node:assert/strict";
import {duplicateAngles} from "../lib/campaign-quality";
const a={hook:"Go-live party: 200 people. Week six: one person and a spreadsheet.",body:"A fictional launch then a lonely spreadsheet."},b={hook:"Hypothetical go-live: 200 people at the launch. Week six: one person and a spreadsheet.",body:"An altered caption about the same scene."};
assert.deepEqual(duplicateAngles([a,b]),[{index:1,earlier:0}]);
assert.equal(duplicateAngles([a,{hook:"Which fields should an invoice sample preserve?",body:"Ask the owner to check row-level quantities before a bounded test."}]).length,0);
assert.equal(duplicateAngles([{hook:"First title",body:"A draft."},{hook:"A different title",body:"A draft."}]).length,0,"Very short generic text should not be treated as a high-confidence fuzzy duplicate");
assert.equal(duplicateAngles([a,{hook:"A different title",body:a.body}]).length,1,"A changed hook does not make a repeated substantive body unique");
assert.equal(duplicateAngles([a,{...a}]).length,1);
console.log("PASS exact and substantial hook overlap detection; distinct premises preserved");
