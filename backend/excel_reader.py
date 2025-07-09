import pandas as pd
import os
from typing import Optional

# Load the Excel file with correct path
curr_dir = os.path.dirname(__file__)
excel_file = os.path.join("data", "regions.xlsx")
df = pd.read_excel(excel_file, sheet_name='Sheet1', header=None)

# Forward fill to unmerge cells and fill missing values
df_ffill = df.ffill(axis=0)

# Helper function to find the row index of a section header
def find_section_row(keyword: str) -> Optional[int]:
    for idx, row in df_ffill.iterrows():
        if row.astype(str).str.contains(keyword).any():
            return int(idx) if isinstance(idx, (int, float)) else None
    return None

# Extract Regional Criteria table
regional_criteria_start = find_section_row('Geographical Origin')
if regional_criteria_start is not None:
    regional_criteria = df_ffill.iloc[regional_criteria_start+1:, [4,5]]
    regional_criteria.columns = ['Geographical Origin', 'Country of Origin']
    regional_criteria = regional_criteria.dropna(how='all')
else:
    regional_criteria = pd.DataFrame(data=[], columns=['Geographical Origin', 'Country of Origin'])

def extract_single_column(col: str, df: pd.DataFrame) -> pd.DataFrame:
    col_start = find_section_row(col)
    if col_start is not None:
        df_name = df.iloc[col_start+1:, [1]]
        df_name.columns = [col]
        df_name = df_name.dropna(how='all')
    else:
        df_name = pd.DataFrame(data=[], columns=[col])

    return df_name

# Extract Regulation Content Type table
# reg_content_type_start = find_section_row('Regulation Content Type')
# reg_content_type_end = find_section_row('Regulation Content Type')
# if reg_content_type_start is not None and reg_content_type_end is not None:
#     reg_content_type = df.iloc[reg_content_type_start+1:reg_content_type_end, [1]]
#     reg_content_type.columns = ['Regulation Content Type']
#     reg_content_type = reg_content_type.dropna(how='all')
# else:
#     reg_content_type = pd.DataFrame(data=[], columns=['Regulation Content Type'])

# Extract Regulation Statuses table
# reg_statuses_start = find_section_row('Regulation Statuses')
# if reg_statuses_start is not None:
#     reg_statuses = df.iloc[reg_statuses_start+1:, [1]]
#     reg_statuses.columns = ['Regulation Statuses']
#     reg_statuses = reg_statuses.dropna(how='all')
# else:
#     reg_statuses = pd.DataFrame(data=[], columns=['Regulation Statuses'])

reg_content_type = extract_single_column('Regulation Content Type', df)
reg_statuses = extract_single_column('Regulation Statuses', df)

# Save each table to a separate CSV (optional)

regional_criteria.to_csv(os.path.join("output", "regional_criteria.csv"), index=False)
reg_content_type.to_csv(os.path.join("output", "regulation_content_type.csv"), index=False)
reg_statuses.to_csv(os.path.join("output", "regulation_statuses.csv"), index=False)


# Display the first few rows of each table
print('Regional Criteria:')
print(regional_criteria.head())
print('\nRegulation Content Type:')
print(reg_content_type.head())
print('\nRegulation Statuses:')
print(reg_statuses.head())
