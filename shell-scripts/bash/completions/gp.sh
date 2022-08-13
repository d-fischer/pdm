__gp_get_projects() {
	if [ "${#COMP_WORDS[@]}" -gt 2 ]; then
		return
	fi

	COMPREPLY=($(compgen -W "$(pdm get-list --shell bash)" "${COMP_WORDS[1]}"))
}

complete -F __gp_get_projects gp
