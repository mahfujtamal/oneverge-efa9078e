import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGeographicFiltering(sessionData: any, targetDistrictId: string) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  // 3-step ISP-filtered district fetch on init
  useEffect(() => {
    if (!sessionData?.isp_id) return;

    (async () => {
      try {
        const { data: coverageData } = await (supabase as any)
          .from("isp_coverage")
          .select("area_id")
          .eq("isp_id", sessionData.isp_id);

        const coveredAreaIds = coverageData?.map((c: any) => c.area_id) || [];
        if (coveredAreaIds.length === 0) {
          setDistricts([]);
          return;
        }

        const { data: areaData } = await (supabase as any)
          .from("areas")
          .select("district_id")
          .in("id", coveredAreaIds);

        const uniqueDistrictIds = [...new Set(areaData?.map((a: any) => a.district_id))];
        if (uniqueDistrictIds.length === 0) {
          setDistricts([]);
          return;
        }

        const { data: districtData } = await (supabase as any)
          .from("districts")
          .select("id, name")
          .eq("is_active", true)
          .in("id", uniqueDistrictIds)
          .order("name", { ascending: true });

        if (districtData) setDistricts(districtData);
      } catch (err) {
        console.error("Failed to fetch districts:", err);
      }
    })();
  }, [sessionData?.isp_id]);

  // Cascading ISP-coverage-filtered area fetch when district changes
  useEffect(() => {
    if (!targetDistrictId || !sessionData?.isp_id) {
      setAreas([]);
      return;
    }

    (async () => {
      try {
        const { data: coverageData, error: coverageError } = await (supabase as any)
          .from("isp_coverage")
          .select("area_id")
          .eq("isp_id", sessionData.isp_id);

        if (coverageError) throw coverageError;

        const coveredAreaIds = coverageData?.map((c: any) => c.area_id) || [];
        if (coveredAreaIds.length === 0) {
          setAreas([]);
          return;
        }

        const { data: areaData, error: areaError } = await (supabase as any)
          .from("areas")
          .select("id, name")
          .eq("district_id", targetDistrictId)
          .eq("is_active", true)
          .in("id", coveredAreaIds)
          .order("name", { ascending: true });

        if (areaError) throw areaError;
        setAreas(areaData || []);
      } catch (error) {
        console.error("Failed to fetch covered areas:", error);
        setAreas([]);
      }
    })();
  }, [targetDistrictId, sessionData?.isp_id]);

  return { districts, areas };
}
