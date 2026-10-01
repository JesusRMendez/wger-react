import { Equipment } from "@/components/Exercises";
import { Autocomplete, TextField } from "@mui/material";
import React from "react";

/** Multi-select of equipment, by id */
export const EquipmentSelect = (props: {
    label: string,
    options: Equipment[],
    value: number[],
    onChange: (value: number[]) => void,
}) => {
    const selected = props.options.filter(option => props.value.includes(option.id));

    return <Autocomplete
        multiple
        options={props.options}
        value={selected}
        getOptionLabel={option => option.translatedName}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={(_event, value) => props.onChange(value.map(option => option.id))}
        renderInput={params => <TextField {...params} label={props.label} />}
        noOptionsText=" "
        fullWidth
    />;
};
