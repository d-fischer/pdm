__gp_get_projects() {
	if [ "${#COMP_WORDS[@]}" -ne 2 ]; then
		return
	fi
	COMPREPLY=($(pdm get-list))
}

complete -F __gp_get_projects gp
