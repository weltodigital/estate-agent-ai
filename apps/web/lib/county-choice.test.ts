import { describe, expect, it } from "vitest";
import { chooseCounty } from "./county-choice";

const town = (name_1: string, local_type = "Town") => ({ name_1, local_type });

describe("chooseCounty", () => {
  it("leaves a unique town alone", () => {
    expect(chooseCounty({ admin_county: null, admin_district: "Portsmouth", country: "England" }, [town("Portsmouth", "City")], "Portsmouth")).toBeNull();
  });

  it("adds the county when towns share a name", () => {
    const farnhams = [town("Farnham"), town("Farnham", "Village"), town("Farnham", "Village")];
    expect(chooseCounty({ admin_county: "Surrey", admin_district: "Waverley", country: "England" }, farnhams, "Farnham")).toBe("Surrey");
  });

  it("falls back to the unitary authority", () => {
    const newports = [town("Newport"), town("Newport", "Village")];
    expect(chooseCounty({ admin_county: null, admin_district: "Isle of Wight", country: "England" }, newports, "Newport")).toBe("Isle of Wight");
  });

  it("uses the country when the authority is the town itself", () => {
    const newports = [town("Newport", "City"), town("Newport")];
    expect(chooseCounty({ admin_county: null, admin_district: "Casnewydd - Newport", country: "Wales" }, newports, "Newport")).toBe("Wales");
  });

  it("ignores suburbs and hamlets with the same name", () => {
    expect(chooseCounty({ admin_county: null, admin_district: "Portsmouth", country: "England" }, [town("Southsea", "Suburban Area"), town("Southsea", "Village")], "Southsea")).toBeNull();
  });
});
